"""
This module contains the routes for the papers API.
It allows users to upload, update, and manage papers within projects.
"""

import logging
from sanic import Blueprint, Request
from sanic.response import json as json_response
from database.models.papers import Paper
from database.models.projects import Project
from routes.auth import require_jwt
from workers.celery_config import reprocess_paper


logger = logging.getLogger(__name__)

paper_bp = Blueprint("papers", url_prefix="/api/papers")


@paper_bp.route("/update/<paper_id>", methods=["POST"], name="update_paper_results")
@require_jwt
async def update_paper_results(request: Request, paper_id: str):
    """
    Update results for an existing paper when features have changed.
    """
    user = request.ctx.user

    try:
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

        # Trigger reprocessing using the dedicated task
        task = reprocess_paper.delay(
            paper_id=paper_id,
            socket_id=socket_id,
            user_email=user.email,
            project_id=project_id,
            strategy_type=strategy_type,
        )

        return json_response(
            {
                "message": "Reprocessing started",
                "task_id": task.id,
                "paper_id": paper_id,
            }
        )

    except Exception as e:
        logger.error(f"Error updating paper results: {e}")
        return json_response({"error": str(e)}, status=500)


@paper_bp.route("/batch-update", methods=["POST"], name="batch_update_papers")
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

        for paper_id in paper_ids:
            try:
                paper = Paper.get(paper_id).run()
                if not paper or paper.user.id != user.id:
                    tasks[paper_id] = {"status": "error", "error": "Unauthorized"}
                    continue

                task = reprocess_paper.delay(
                    paper_id=paper_id,
                    socket_id=f"batch_{project_id}_{paper_id}",
                    user_email=user.email,
                    project_id=project_id,
                    strategy_type=strategy_type,
                )

                tasks[paper_id] = {"status": "processing", "task_id": task.id}

            except Exception as e:
                logger.error(f"Error processing paper {paper_id}: {e}")
                tasks[paper_id] = {"status": "error", "error": str(e)}

        return json_response({"message": "Batch update started", "tasks": tasks})

    except Exception as e:
        logger.error(f"Error in batch update: {e}")
        return json_response({"error": str(e)}, status=500)
