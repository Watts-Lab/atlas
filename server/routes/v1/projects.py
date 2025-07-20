"""
This module contains the routes for the projects API.
"""

import logging

from bunnet import PydanticObjectId
from bunnet.operators import In
from controllers.project import (
    create_project,
    delete_project,
    get_project_detail,
    update_project,
)
from controllers.score import score_csv_data
from database.models.projects import Project
from database.models.results import Result
from routes.auth import require_jwt
from routes.error_handler import error_handler
from sanic import Blueprint
from sanic import json as json_response
from sanic.request import Request

logger = logging.getLogger(__name__)

projects_bp = Blueprint("projects", url_prefix="/projects")


@projects_bp.route("/", methods=["GET", "POST"], name="projects")
@require_jwt
@error_handler
async def project(request: Request):
    """
    A protected route for creating/getting projects.
    """

    # Validate user from JWT
    user = request.ctx.user

    if request.method == "POST":
        project_name = request.json.get("project_name")
        project_description = request.json.get("project_description")
        project_features = request.json.get("project_features")

        if not project_name:
            return json_response({"error": "Project name is required."}, status=400)

        new_project = create_project(
            project_name=project_name,
            project_description=project_description,
            project_features=project_features,
            user=user,
        )

        return json_response(
            {
                "message": "Project created.",
                "project_id": str(new_project.id),
            },
        )

    if request.method == "GET":
        projects = Project.find(Project.user.id == user.id).to_list()

        results: Result = Result.find(
            In(Result.project.id, [p.id for p in projects]),
            fetch_links=True,
            nesting_depth=1,
        ).run()

        pr_response = [
            p.model_dump(
                mode="json",
                include=["id", "title", "description", "updated_at", "papers"],
            )
            for p in projects
        ]

        for proj in pr_response:
            proj["papers"] = [str(pap["id"]) for pap in proj["papers"]]
            proj["results"] = [
                {
                    "id": str(r.id),
                    "finished": r.finished if r.finished else False,
                    "paper_id": str(r.paper.id) if r.paper else None,
                }
                for r in results
                if str(r.project.id) == str(proj["id"])
            ]

        return json_response({"project": pr_response})


@projects_bp.route(
    "/<project_id>", methods=["GET", "PUT", "DELETE"], name="project_detail"
)
@require_jwt
@error_handler
async def project_detail(request: Request, project_id: str):
    """
    A protected route for getting/updating a project.
    """
    # Validate user from JWT
    user = request.ctx.user

    if request.method == "GET":
        # Get project details
        project_data, results = get_project_detail(project_id)
        if not project_data:
            return json_response({"error": "Project not found."}, status=404)
        return json_response({"project": project_data, "results": results})

    if request.method == "PUT":
        # Update project details
        project_name = request.json.get("project_name")
        project_description = request.json.get("project_description")
        project_prompt = request.json.get("project_prompt")

        updated = update_project(
            project_id=project_id,
            project_name=project_name,
            project_description=project_description,
            project_prompt=project_prompt,
        )
        if not updated:
            return json_response({"error": "Project not found."}, status=404)
        return json_response({"message": "Project updated.", "project": updated})

    if request.method == "DELETE":
        # Delete project
        removed = delete_project(project_id, user)
        if not removed:
            return json_response({"error": "Project not found."}, status=404)

        return json_response({"message": "Project deleted."})


@projects_bp.route(
    "/<project_id>/results", methods=["GET", "DELETE"], name="project_results"
)
@require_jwt
@error_handler
async def project_results(request: Request, project_id: str):
    """
    A protected route for getting results of a project.
    """
    user = request.ctx.user
    user_project: Project = Project.get(project_id, fetch_links=True).run()
    if not user_project:
        return json_response({"error": "Project not found."}, status=404)

    if request.method == "GET":
        # Get query parameter for including all versions
        include_versions = (
            request.args.get("include_versions", "false").lower() == "true"
        )

        # TODO: Should check if the user is the owner of the project
        if include_versions:
            # Get all results including historical versions, sorted by paper_id first, then by creation time
            project_result = (
                Result.find(Result.project.id == user_project.id, fetch_links=True)
                .sort(["+paper", "-created_at"])
                .to_list()
            )
        else:
            # Get only latest results, sorted by paper_id
            project_result = (
                Result.find(
                    Result.project.id == user_project.id,
                    Result.is_latest == True,
                    fetch_links=True,
                )
                .sort([("-paper", 1), ("-created_at", 1)])
                .to_list()
            )

        project_json_responses = []
        project_response_ids = []
        for r in project_result:
            response_data = {
                **r.json_response,
                "created_at": (
                    r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else None
                ),
                "_version": getattr(r, "version", 1),
                "_is_latest": getattr(r, "is_latest", True),
                "_result_id": str(r.id),
                "_paper_id": str(r.paper.id) if r.paper else None,
            }
            project_json_responses.append(response_data)
            project_response_ids.append(str(r.id))

        return json_response(
            {
                "message": "results found.",
                "results": project_json_responses,
                "ids": project_response_ids,
            }
        )

    if request.method == "DELETE":
        # Delete multiple results for a project
        result_ids = request.json.get("result_ids", [])

        if user_project.user.id != user.id:
            return json_response(
                {"error": "You do not have permission to delete these results."},
                status=403,
            )

        if not result_ids:
            return json_response({"error": "No result IDs provided."}, status=400)

        results = Result.find(
            In(Result.id, [PydanticObjectId(r_id) for r_id in result_ids]),
            fetch_links=True,
            nesting_depth=1,
        ).run()

        if not results:
            return json_response({"error": "No results found."}, status=404)

        # Process each result to handle is_latest flag properly
        for result in results:
            # If this result was the latest version, find the previous version and mark it as latest
            if result.is_latest and result.paper:
                # Find the most recent previous version for this paper in this project
                previous_version = (
                    Result.find(
                        Result.project.id == user_project.id,
                        Result.paper.id == result.paper.id,
                        Result.id
                        != result.id,  # Exclude the current result being deleted
                        fetch_links=True,
                    )
                    .sort("-created_at")  # Get the most recent one
                    .limit(1)
                    .to_list()
                )

                # If there's a previous version, mark it as latest
                if previous_version:
                    previous_version[0].is_latest = True
                    previous_version[0].save()

            # Delete the result
            result.delete()

        return json_response({"message": "Results deleted."})


@projects_bp.route("/<project_id>/score_csv", methods=["POST"], name="project_analysis")
@require_jwt
@error_handler
async def score_csv_endpoint(request: Request, project_id: str):
    """
    A protected route for scoring CSV data.
    """
    csv_file = request.files.get("file")
    if not csv_file:
        return json_response({"error": "No CSV file provided."}, status=400)
    result = score_csv_data(csv_file.body, project_id)
    return json_response(result)


# • /api/projects/:
#   – GET    -> list projects
#   – POST   -> create new project
#   - DELETE -> delete multiple projects

# • /api/projects/<project_id>:
#   – GET    -> retrieve project
#   – PUT    -> update project
#   – DELETE -> delete project

# • /api/projects/<project_id>/features:
#   – GET    -> list features for a project
#   – POST   -> add new feature to a project

# • /api/projects/<project_id>/results:
#   – GET    -> list or retrieve results
#   – POST   -> create new result

# • /api/projects/<project_id>/results/<result_id>:
#   – GET    -> retrieve single result
#   – PUT    -> update existing result
