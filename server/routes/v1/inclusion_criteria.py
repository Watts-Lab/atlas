"""Routes for Inclusion Criteria."""

from controllers.inclusion_criteria import (
    create_criteria,
    delete_criteria,
    list_criteria,
    update_criteria,
)
from database.models.projects import Project
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1.docs import inclusion_criteria as docs
from sanic import Blueprint
from sanic import json as json_response
from sanic.request import Request

ic_bp = Blueprint("inclusion_criteria", url_prefix="/projects")


@ic_bp.route(
    "/<project_id>/inclusion-criteria",
    methods=["GET", "POST"],
    name="project_inclusion_criteria",
)
@docs.project_inclusion_criteria
@require_jwt
@error_handler
async def project_inclusion_criteria(request: Request, project_id: str):
    """List or create inclusion criteria for a project."""
    project = Project.get(project_id).run()
    if not project:
        return json_response({"error": "Project not found."}, status=404)

    if request.method == "GET":
        criteria = list_criteria(project_id)
        return json_response({"criteria": criteria})

    if request.method == "POST":
        name = request.json.get("name")
        description = request.json.get("description", "")
        formula = request.json.get("formula")

        if not name:
            return json_response({"error": "Name is required."}, status=400)
        if formula is None:
            return json_response({"error": "Formula is required."}, status=400)

        created = create_criteria(project_id, name, description, formula)
        if not created:
            return json_response({"error": "Failed to create criteria."}, status=500)

        return json_response({"criteria": created}, status=201)


@ic_bp.route(
    "/<project_id>/inclusion-criteria/<criteria_id>",
    methods=["PUT", "DELETE"],
    name="project_inclusion_criteria_detail",
)
@docs.project_inclusion_criteria_detail
@require_jwt
@error_handler
async def project_inclusion_criteria_detail(
    request: Request, _project_id: str, criteria_id: str
):
    """Update or delete a specific inclusion criterion."""
    if request.method == "PUT":
        name = request.json.get("name")
        description = request.json.get("description")
        formula = request.json.get("formula")

        updated = update_criteria(criteria_id, name, description, formula)
        if not updated:
            return json_response({"error": "Criteria not found."}, status=404)

        return json_response({"criteria": updated})

    if request.method == "DELETE":
        deleted = delete_criteria(criteria_id)
        if not deleted:
            return json_response({"error": "Criteria not found."}, status=404)

        return json_response({"message": "Criteria deleted."})
