"""
Celery task for evaluating feature repeatability.
"""

import logging
import os
import math
from typing import Optional

import polars as pl
from database.models.features import Features
from database.models.papers import Paper
from database.models.repeatability import RepeatabilityResult
from openai import OpenAI
from utils.flatten import flatten_object
from utils.krippendorff import krippendorff_alpha
from workers.celery_config import celery
from workers.services.file_s3_service import FileService
from workers.services.socket_emitter import SocketEmmiter
from workers.strategies.openai_json_schema_strategy import OpenAIJSONSchemaStrategy

logger = logging.getLogger(__name__)


@celery.task(name="evaluate_feature_repeatability", bind=True)
def evaluate_feature_repeatability(
    self,
    feature_id: str,
    paper_id: str,
    user_id: str,
    project_id: Optional[str],
    socket_id: str,
    num_runs: int = 5,
):
    """
    Evaluate the repeatability of a feature by running extraction multiple times.
    """
    task_id = self.request.id
    emitter = SocketEmmiter(socket_id, task_id)

    try:
        emitter.emit_status(message="Starting repeatability evaluation...", progress=0)

        # Load models
        feature = Features.get(feature_id).run()
        paper = Paper.get(paper_id).run()

        if not feature or not paper:
            emitter.emit_status(
                message="Feature or paper not found", progress=0, status="FAILURE"
            )
            return {"error": "Feature or paper not found"}

        # Create result entry
        result_doc = RepeatabilityResult(
            feature=feature,
            feature_version=feature.version,
            paper=paper,
            user=user_id,
            status="processing",
            task_id=task_id,
        )
        result_doc.insert()

        file_service = FileService()
        emitter.emit_status(message="Downloading paper from storage...", progress=5)
        temp_file_path = file_service.download_from_s3(paper.s3_key)

        client = OpenAI()
        # Handle project_id that might be empty string or None
        safe_project_id = project_id if project_id and project_id.strip() else None
        strategy = OpenAIJSONSchemaStrategy(client, safe_project_id, emitter)

        extractions = []
        for i in range(num_runs):
            emitter.emit_status(
                message=f"Running extraction {i+1}/{num_runs}...",
                progress=int((i / num_runs) * 90),
            )

            try:
                # We use a custom temperature for repeatability (0.7 is default)
                # To test repeatability, we want to see how much it varies at the same temperature.
                res = strategy.extract(
                    temp_file_path, feature_ids=[feature_id], silent=True
                )
                extractions.append(res["result"])
            except Exception as e:
                logger.error(f"Extraction {i+1} failed: {e}")
                extractions.append(None)

        # Cleanup temp file
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            logger.info("Removed temp file: %s", temp_file_path)

        # Save extractions
        result_doc.extractions = extractions
        result_doc.save()

        # Calculate Repeatability
        emitter.emit_status(message="Calculating repeatability score...", progress=95)

        try:
            # Prepare data for Krippendorff's Alpha
            # We want to flatten each extraction and find the values for our feature.
            all_dfs = []
            for i, ext in enumerate(extractions):
                if ext is None:
                    continue

                # Flatten the extraction result
                flat_res = flatten_object(ext)
                # Convert to Polars DataFrame
                df = pl.DataFrame(flat_res)
                df = df.with_columns(
                    pl.lit(f"rater_{i+1}").alias("rater"),
                    pl.Series(range(len(flat_res))).alias("item_idx"),  # capital S
                )
                all_dfs.append(df)

            if not all_dfs:
                raise Exception("No extraction data collected")

            combined = pl.concat(all_dfs, how="vertical")

            # Pivot to get (item, rater) matrix
            # We need to find the column that matches our feature identifier.
            # The flatten_object prefixes keys correctly.

            # Identify target column
            cols = [
                c
                for c in combined.columns
                if feature.feature_name in c
                or feature.feature_identifier.split(".")[-1] in c
            ]

            if not cols:
                # Fallback: cols that are not metadata
                cols = [c for c in combined.columns if c not in ["rater", "item_idx"]]

            if cols:
                target_col = cols[0]
                # Pivot: index="item_idx", columns="rater", values=target_col
                matrix = combined.pivot(on="rater", index="item_idx", values=target_col)

                # Convert to matrix (raters, items) for Krippendorff
                # matrix has [item_idx, rater_1, rater_2...]
                # We drop item_idx and transpose
                data_matrix = matrix.drop("item_idx").to_numpy().T

                # Determine metric
                metric = "nominal"
                # If target_col is numeric, use 'interval'
                sample_vals = combined[target_col].drop_nulls()
                if len(sample_vals) > 0 and sample_vals.dtype in [
                    pl.Float64,
                    pl.Int64,
                    pl.Float32,
                    pl.Int32,
                ]:
                    metric = "interval"

                alpha = krippendorff_alpha(data_matrix, metric=metric)
                if num_runs == 1 and not math.isnan(alpha):
                    alpha = 1.0
                result_doc.alpha_score = float(alpha)
            else:
                result_doc.alpha_score = 0.0

        except Exception as e:
            logger.error(f"Score calculation failed: {e}")
            result_doc.alpha_score = -1.0  # Error state

        result_doc.status = "completed"
        result_doc.save()

        emitter.emit_done(
            message=f"Repeatability evaluation complete. Alpha: {result_doc.alpha_score:.3f}"
        )
        return {
            "result_id": str(result_doc.id),
            "alpha": result_doc.alpha_score,
            "extraction": extractions[0] if num_runs == 1 and extractions else None,
        }

    except Exception as e:
        logger.exception("Error in repeatability evaluation")
        emitter.emit_status(message=f"Error: {str(e)}", progress=0, status="FAILURE")
        if "result_doc" in locals():
            result_doc.status = "failed"
            result_doc.save()
        raise
