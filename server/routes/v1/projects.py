"""
This module contains the routes for the projects API.
"""

import json
import logging
import jwt
from openai import OpenAI
import polars as pl
from sklearn.metrics import f1_score, r2_score
from controllers.project import create_project
from database.models.features import Features
from database.models.projects import Project
from routes.auth import require_jwt
from sanic import Blueprint
from sanic import json as json_response
from sanic.request import Request
from bunnet.operators import In

logger = logging.getLogger(__name__)

projects_bp = Blueprint("projects", url_prefix="/projects")


@projects_bp.route("/", methods=["GET", "POST"], name="projects")
@require_jwt
async def project(request: Request):
    """
    A protected route for creating/getting projects.
    """
    try:
        # Validate user from JWT
        user = request.ctx.user
        if not user:
            return json_response({"error": "User not found."}, status=404)

        if request.method == "POST":
            project_name = "New Project"
            project_description = "New Project"
            new_project = create_project(project_name, project_description, user)
            return json_response(
                {"message": "Project created.", "project_id": new_project}
            )

        elif request.method == "GET":
            projects = Project.find(
                Project.user.id == user.id, fetch_links=True
            ).to_list()

            pr_response = [
                p.model_dump(
                    mode="json",
                    include=["id", "title", "description", "updated_at", "papers"],
                )
                for p in projects
            ]

            for proj in pr_response:
                proj["papers"] = [str(pap["id"]) for pap in proj["papers"]]

            if projects:
                return json_response({"project": pr_response})
            else:
                return json_response({"error": "No projects found."}, status=404)

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)
    except Exception as e:
        return json_response({"error": str(e)}, status=500)


@projects_bp.route("/<project_id>", methods=["GET", "PUT"], name="project_detail")
@require_jwt
async def project_detail(request: Request, project_id: str):
    """
    A protected route for getting/updating a project.
    """
    try:
        # Validate user from JWT
        user = request.ctx.user
        if not user:
            return json_response({"error": "User not found."}, status=404)

        if request.method == "GET":
            user_project = Project.get(project_id, fetch_links=True).run()
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)

            project_dict = user_project.model_dump(
                mode="json", exclude=["user"], serialize_as_any=True
            )
            project_dict["slug"] = str(project_dict["slug"])
            project_dict["created_at"] = str(project_dict["created_at"])
            project_dict["updated_at"] = str(project_dict["updated_at"])
            project_dict["papers"] = [str(pap.id) for pap in user_project.papers]

            for proj in user_project.papers:
                print("proj ", len(proj.truth_ids))

            papers = [
                {
                    "task_id": pap.title,
                    "status": "success" if pap.truth_ids else "failed",
                    "file_name": pap.title,
                    "experiments": pap.experiments,
                }
                for pap in user_project.papers
            ]

            if user_project:
                return json_response({"project": project_dict, "results": papers})
            else:
                return json_response({"error": "Project not found."}, status=404)

        elif request.method == "PUT":
            # Update project details
            project_name = request.json.get("project_name")
            user_project = Project.get(project_id).run()
            if not user_project:
                return json_response({"error": "Project not found."}, status=404)
            user_project.title = project_name
            user_project.save()
            project_dict = user_project.model_dump(
                mode="json", exclude=["user"], serialize_as_any=True
            )
            project_dict["slug"] = str(project_dict["slug"])
            project_dict["created_at"] = str(project_dict["created_at"])
            project_dict["updated_at"] = str(project_dict["updated_at"])
            return json_response(
                {"message": "Project updated.", "project": project_dict}
            )

    except jwt.ExpiredSignatureError:
        return json_response({"error": "Token has expired."}, status=401)
    except jwt.InvalidTokenError:
        return json_response({"error": "Invalid token."}, status=401)
    except Exception as e:
        return json_response({"error": str(e)}, status=500)


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
    except Exception as e:
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


@projects_bp.route("/<project_id>/score_csv", methods=["POST"], name="project_analysis")
@require_jwt
async def score_csv_endpoint(request: Request, project_id: str):
    """
    Endpoint to upload a CSV of ground truth, compute scores, and return results.
    """
    try:
        csv_file = request.files.get("file")
        if not csv_file:
            return json_response({"error": "No CSV file provided."}, status=400)

        # Read in-memory with Polars
        file_bytes = csv_file.body
        df = pl.read_csv(file_bytes)

        # Clean or rename columns if needed
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
            gpt_interface = feature_db.feature_gpt_interface or {}
            feature_type = gpt_interface.get("type", "string")
            enum_vals = gpt_interface.get("enum", [])
            if len(enum_vals) > 0:
                feature_columns.append(
                    {
                        "identifier": feature_db.feature_identifier,
                        "type": feature_type,
                        "enum": enum_vals,
                    }
                )
            else:
                feature_columns.append(
                    {
                        "identifier": feature_db.feature_identifier,
                        "type": feature_type,
                    }
                )

        # Prepare a dictionary to store row-wise scores
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

                # Score according to feature type
                if feat["type"] == "string" and "enum" in feat:
                    # Categorical
                    sc = compute_categorical_score(truth_val, pred_val)
                elif feat["type"] == "string":
                    # Possibly GPT or naive string scoring
                    sc = compute_string_score(truth_val, pred_val)
                elif feat["type"] == "number":
                    sc = compute_number_score(truth_val, pred_val)
                else:
                    sc = None

                score_dict[score_key].append(sc)

        # Compute aggregated metrics (F1 for enums, R² for numeric, or user logic)
        aggregate_scores = {}
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
                    score = None
                    logger.error("Error computing F1 for %s: %s", ident, e)

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
                    score = None
                    logger.error("Error computing R² for %s: %s", ident, e)
            else:
                score = None

            aggregate_scores[ident] = score

        return json_response(
            {
                "status": "success",
                "per_row_scores": score_dict,
                "aggregate_scores": aggregate_scores,
            },
            status=200,
        )

    except Exception as e:
        return json_response({"error": str(e)}, status=500)


# • /api/projects/<project_id>/features:
#   – GET    -> list features for a project
#   – POST   -> add new feature to a project

# • /api/projects/<project_id>/results:
#   – GET    -> list or retrieve results
#   – POST   -> create new result (if that’s a valid use case)

# • /api/projects/<project_id>/results/<result_id>:
#   – GET    -> retrieve single result
#   – PUT    -> update existing result
