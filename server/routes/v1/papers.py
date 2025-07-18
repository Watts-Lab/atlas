"""
This module contains the routes for the papers API.
It allows users to upload, update, and manage papers within projects.
"""

import logging
from sanic import Blueprint, Request
from sanic.response import json as json_response
from database.models.papers import Paper
from database.models.projects import Project
from database.models.results import Result
from routes.auth import require_jwt
from workers.add_paper_task import add_paper
from workers.services.file_s3_service import FileService


logger = logging.getLogger(__name__)

paper_bp = Blueprint("papers", url_prefix="/papers")


@paper_bp.route("/update/<paper_id>", methods=["POST"])
@require_jwt
async def update_paper_results(request: Request, paper_id: str):
    """
    Update results for an existing paper when features have changed.

    This endpoint allows re-processing a paper that's already in S3
    without re-uploading the file.
    """
    user = request.ctx.user

    try:
        # Get request data
        data = request.json
        project_id = data.get("project_id")
        strategy_type = data.get("strategy_type", "assistant_api")
        socket_id = data.get("sid", f"update_{paper_id}")

        if not project_id:
            return json_response({"error": "project_id is required"}, status=400)

        # Validate paper exists and user has access
        paper = Paper.get(paper_id, fetch_links=True).run()
        if not paper:
            return json_response({"error": "Paper not found"}, status=404)

        if paper.user.id != user.id:
            return json_response({"error": "Unauthorized"}, status=403)

        # Validate project exists and user has access
        project = Project.get(project_id, fetch_links=True).run()
        if not project:
            return json_response({"error": "Project not found"}, status=404)

        if project.user.id != user.id:
            return json_response({"error": "Unauthorized"}, status=403)

        # Check if features have actually changed
        latest_result = Result.find_one(
            Result.paper.id == paper.id,
            Result.project.id == project.id,
            Result.is_latest,
        ).run()

        current_features = [f.feature_identifier for f in project.features]

        if latest_result and set(latest_result.feature_list) == set(current_features):
            return json_response(
                {
                    "message": "Features haven't changed, no update needed",
                    "result_id": str(latest_result.id),
                }
            )

        # Download file from S3 to temp location
        file_service = FileService()
        temp_file_path = await file_service.download_from_s3(paper.s3_key)

        # Trigger reprocessing
        task = add_paper.delay(
            file_path=temp_file_path,
            socket_id=socket_id,
            user_email=user.email,
            project_id=project_id,
            strategy_type=strategy_type,
            original_filename=paper.original_filename,
        )

        return json_response(
            {
                "message": "Reprocessing started",
                "task_id": task.id,
                "paper_id": paper_id,
            }
        )

    except Exception as e:
        logger.error("Error updating paper results: %s", e)
        return json_response({"error": str(e)}, status=500)


@paper_bp.route("/batch-update", methods=["POST"])
@require_jwt
async def batch_update_papers(request: Request):
    """
    Update multiple papers in a project when features have changed.
    """
    user = request.ctx.user

    try:
        data = request.json
        project_id = data.get("project_id")
        paper_ids = data.get("paper_ids", [])
        strategy_type = data.get("strategy_type", "assistant_api")

        if not project_id:
            return json_response({"error": "project_id is required"}, status=400)

        # Validate project
        project = Project.get(project_id, fetch_links=True).run()
        if not project or project.user.id != user.id:
            return json_response(
                {"error": "Project not found or unauthorized"}, status=404
            )

        # If no paper_ids provided, update all papers in project
        if not paper_ids:
            paper_ids = [str(paper.id) for paper in project.papers]

        tasks = {}
        file_service = FileService()

        for paper_id in paper_ids:
            try:
                paper = Paper.get(paper_id).run()
                if not paper or paper.user.id != user.id:
                    continue

                # Check if update is needed
                latest_result = Result.find_one(
                    Result.paper.id == paper.id,
                    Result.project.id == project.id,
                    Result.is_latest,
                ).run()

                current_features = [f.feature_identifier for f in project.features]

                if latest_result and set(latest_result.feature_list) == set(
                    current_features
                ):
                    tasks[paper_id] = {
                        "status": "skipped",
                        "reason": "features unchanged",
                    }
                    continue

                # Download and process
                temp_file_path = await file_service.download_from_s3(paper.s3_key)

                task = add_paper.delay(
                    file_path=temp_file_path,
                    socket_id=f"batch_{project_id}",
                    user_email=user.email,
                    project_id=project_id,
                    strategy_type=strategy_type,
                    original_filename=paper.original_filename,
                )

                tasks[paper_id] = {"status": "processing", "task_id": task.id}

            except Exception as e:
                logger.error("Error processing paper %s: %s", paper_id, e)
                tasks[paper_id] = {"status": "error", "error": str(e)}

        return json_response({"message": "Batch update started", "tasks": tasks})

    except Exception as e:
        logger.error("Error in batch update: %s", e)
        return json_response({"error": str(e)}, status=500)


@paper_bp.route("/<paper_id>/versions", methods=["GET"])
@require_jwt
async def get_paper_versions(request: Request, paper_id: str):
    """Get all result versions for a paper in a project."""
    user = request.ctx.user
    project_id = request.args.get("project_id")

    if not project_id:
        return json_response({"error": "project_id is required"}, status=400)

    try:
        # Validate access
        paper = Paper.get(paper_id).run()
        if not paper or paper.user.id != user.id:
            return json_response(
                {"error": "Paper not found or unauthorized"}, status=404
            )

        # Get all results for this paper in the project
        results = (
            Result.find(Result.paper.id == paper.id, Result.project.id == project_id)
            .sort("-version")
            .to_list()
        )

        versions = []
        for result in results:
            versions.append(
                {
                    "id": str(result.id),
                    "version": result.version,
                    "is_latest": result.is_latest,
                    "created_at": result.created_at.isoformat(),
                    "features_used": result.feature_list,
                    "tokens": {
                        "prompt": result.prompt_token,
                        "completion": result.completion_token,
                    },
                }
            )

        return json_response({"paper_id": paper_id, "versions": versions})

    except Exception as e:
        logger.error("Error getting paper versions: %s", e)
        return json_response({"error": str(e)}, status=500)
