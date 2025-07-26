"""
This module contains functions to compute scores for CSV data based on features
"""

from datetime import datetime
import json
import logging
import os
from database.models.features_quality import FeaturesQuality
from database.models.projects import Project
from workers.celery_config import celery
from celery import Task
import polars as pl
from sklearn.metrics import f1_score, r2_score
from database.models.features import Features
from database.models.users import User
from openai import OpenAI
from bunnet.operators import In

logger = logging.getLogger(__name__)


def compute_categorical_score(truth, prediction):
    """For categorical enums: return 1 if exact match, else 0."""
    return 1 if truth == prediction else 0


def compute_number_score(truth, prediction):
    """
    Simple numeric error-based score:
    Score = 1 - (|truth - pred| / (|truth| + epsilon)).
    """
    try:
        error = abs(float(truth) - float(prediction))
        denom = abs(float(truth)) + 1e-8
        return max(0, 1 - error / denom)
    except Exception:
        return 0.0


# If you do not actually need GPT-based string comparison, you can do a simpler placeholder:
def compute_string_score(truth, prediction):
    """
    Example string comparison that just compares equality or partial similarity.
    Use your own GPT logic or placeholder from your notebook.
    """
    truth_lower = str(truth).lower().strip()
    pred_lower = str(prediction).lower().strip()
    # Very naive measure:
    return 1.0 if truth_lower == pred_lower else 0.0


def gpt_function_string_comparison(user_refrence, gpt_answer):
    """
    Compare the user refrence and gpt answer and return the similarity score.
    """

    client = OpenAI()

    prompt = (
        # do these two strings convey the same meaning
        f"Do these two strings convey the same message or are they similar?\n\n"
        f"String 1: {user_refrence}\n"
        f"String 2: {gpt_answer}\n\n"
    )

    gpt_function = {
        "type": "function",
        "function": {
            "name": "compare_strings",
            "description": "Determines if two strings convey the same message or if they are similar",
            "parameters": {
                "type": "object",
                "properties": {
                    "similarity_threshold": {
                        "type": "string",
                        "description": "How similar are the two strings and do they convey the same message?",
                        "enum": [
                            "Very different",
                            "Different",
                            "Similar",
                            "Very similar",
                        ],
                    }
                },
                "additionalProperties": False,
                "required": ["similarity_threshold"],
            },
            "strict": True,
        },
    }

    try:
        response = client.chat.completions.create(
            model="o3-mini",
            # model="gpt-4o",
            messages=[
                {"role": "user", "content": [{"type": "text", "text": prompt}]},
            ],
            response_format={"type": "text"},
            reasoning_effort="high",
            # temperature=0,
            tools=[gpt_function],
            tool_choice={"type": "function", "function": {"name": "compare_strings"}},
        )

        function_args = json.loads(
            response.choices[0].message.tool_calls[0].function.arguments
        )
        similarity_category = function_args.get("similarity_threshold")

        if similarity_category is None:
            raise ValueError("similarity_threshold key not found in the response.")

        return similarity_category

    except Exception as e:
        print("An error occurred in gpt_function_string_comparison:", e)
        return "Different"


@celery.task(bind=True, name="score_csv_data")
def score_csv_data(self: Task, file_path: str, project_id: str, user_email: str = None):
    """
    Score the CSV data based on the features in the database.
    """

    try:
        # Get project and user if user_email provided
        project = Project.get(project_id).run()
        if not project:
            raise ValueError(f"Project {project_id} not found")

        user = None
        if user_email:
            user = User.find_one(User.email == user_email).run()

        # Read CSV with Polars from file path
        df = pl.read_csv(file_path)
        new_names = {col: col.replace(" ", ".") for col in df.columns}
        df = df.rename(new_names)

        identifiers = []
        for col in df.columns:
            if col.endswith("_truth"):
                base_identifier = col.replace("_truth", "")
                identifiers.append(base_identifier)

        features_from_db = Features.find_many(
            In(Features.feature_identifier, identifiers)
        ).to_list()

        feature_columns = []
        for feature_db in features_from_db:
            gpt_interface = (
                feature_db.feature_gpt_interface.model_dump(exclude_none=True) or {}
            )
            feature_type = gpt_interface.get("type", "string")
            enum_vals = gpt_interface.get("enum", [])
            if enum_vals:
                feature_columns.append(
                    {
                        "identifier": feature_db.feature_identifier,
                        "type": feature_type,
                        "enum": enum_vals,
                    }
                )
            else:
                feature_columns.append(
                    {"identifier": feature_db.feature_identifier, "type": feature_type}
                )

        score_dict = {}
        for feat in feature_columns:
            score_col = feat["identifier"] + "_score"
            score_dict[score_col] = []

        rows = df.to_dicts()
        for row in rows:
            for feat in feature_columns:
                ident = feat["identifier"]
                truth_key = ident + "_truth"
                score_key = ident + "_score"
                if truth_key not in row or ident not in row:
                    score_dict[score_key].append(None)
                    continue
                truth_val = row[truth_key]
                pred_val = row[ident]
                if feat["type"] == "string" and "enum" in feat:
                    sc = compute_categorical_score(truth_val, pred_val)
                elif feat["type"] == "string":
                    sc = compute_string_score(truth_val, pred_val)
                elif feat["type"] == "number":
                    sc = compute_number_score(truth_val, pred_val)
                else:
                    sc = None
                score_dict[score_key].append(sc)

        aggregate_scores = {}
        features_quality_records = []  # To store FeaturesQuality records

        for feat in feature_columns:
            ident = feat["identifier"]
            truth_col = ident + "_truth"
            if truth_col not in df.columns or ident not in df.columns:
                continue
            if feat["type"] == "string" and "enum" in feat:
                truth_list = df[truth_col].to_list()
                pred_list = df[ident].to_list()
                try:
                    score = f1_score(truth_list, pred_list, average="macro")
                except Exception as e:
                    logger.error("Error computing F1 for %s: %s", ident, e)
                    score = None
            elif feat["type"] == "string":
                truth_list = df[truth_col].to_list()
                pred_list = df[ident].to_list()
                y_pred = []
                for truth_val, gpt_ans in zip(truth_list, pred_list):
                    category = gpt_function_string_comparison(truth_val, gpt_ans)
                    y_pred.append(category)
                y_true = ["Very similar"] * len(truth_list)
                score = f1_score(y_true, y_pred, average="macro")
            elif feat["type"] == "number":
                try:
                    truth_list = [float(v) for v in df[truth_col].to_list()]
                    pred_list = [float(v) for v in df[ident].to_list()]
                    score = r2_score(truth_list, pred_list)
                except Exception as e:
                    logger.error("Error computing R² for %s: %s", ident, e)
                    score = None
            else:
                score = None

            aggregate_scores[ident] = score

            # Create FeaturesQuality record if we have a valid score
            if score is not None:
                # Find the feature in the database
                feature = next(
                    (f for f in features_from_db if f.feature_identifier == ident), None
                )
                if feature:
                    # Check if a FeaturesQuality record already exists for this feature and project
                    existing_quality = FeaturesQuality.find_one(
                        FeaturesQuality.feature.id == feature.id,
                        FeaturesQuality.project.id == project.id,
                        fetch_links=True,
                        nesting_depth=1,
                    ).run()

                    if existing_quality:
                        # Update existing record
                        existing_quality.feature_score = score
                        existing_quality.updated_at = datetime.now()
                        existing_quality.save()
                        features_quality_records.append(existing_quality)
                    else:
                        # Create new record
                        quality_record = FeaturesQuality(
                            feature=feature,
                            project=project,
                            feature_score=score,
                            paper_ids=[],  # You can populate this if you have specific papers
                            results_ids=[],  # You can populate this if you have specific results
                        )
                        quality_record.save()
                        features_quality_records.append(quality_record)

        return {
            "status": "success",
            "per_row_scores": score_dict,
            "aggregate_scores": aggregate_scores,
            "features_quality_records": [
                str(record.id) for record in features_quality_records
            ],
            "project_id": project_id,
        }

    except Exception as exc:
        logger.exception("Error in score_csv_data task: %s", exc)
        return {
            "status": "error",
            "message": str(exc),
            "per_row_scores": {},
            "aggregate_scores": {},
        }
    finally:
        # Clean up the temporary file
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info("Cleaned up temporary file: %s", file_path)
            except Exception as e:
                logger.warning("Failed to clean up temporary file %s: %s", file_path, e)
