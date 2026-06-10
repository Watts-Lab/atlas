"""
This module contains the routes for the assistant API.
"""

from controllers.assisstant import (
    add_paper_to_project_controller,
    get_paper_task_status_controller,
    reprocess_paper_controller,
    reprocess_project_controller,
)
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1.docs import assistant as docs
from sanic import Blueprint, Request
from sanic.response import json as json_response

assistant_bp = Blueprint("assistant", url_prefix="/assistant")


@assistant_bp.route("/add_paper", methods=["POST", "GET"], name="add_paper")
@docs.add_paper
@require_jwt
@error_handler
async def add_paper(request: Request):
    """
    Handles adding a paper or checking task status.
    """
    user = request.ctx.user

    if request.method == "POST":
        files = request.files.getlist("files[]")
        socket_id = request.form.get("sid")
        project_id = request.form.get("project_id")
        strategy_type = request.form.get("strategy_type", "assistant_api")

        result = add_paper_to_project_controller(
            user, files, socket_id, project_id, strategy_type
        )
        if "error" in result:
            return json_response(result, status=result.pop("status", 400))
        return json_response(result)

    if request.method == "GET":
        task_id = request.args.get("task_id")
        result = get_paper_task_status_controller(task_id)
        return json_response(result)


@assistant_bp.route(
    "/reprocess_paper/<paper_id:str>", methods=["POST"], name="reprocess_paper"
)
@docs.reprocess_paper
@require_jwt
@error_handler
async def reprocess_paper(request: Request, paper_id: str):
    """
    Reprocess an existing paper.
    """
    user = request.ctx.user
    data = request.json
    project_id = data.get("project_id")
    strategy_type = data.get("strategy_type", "assistant_api")
    socket_id = data.get("sid")

    result = reprocess_paper_controller(
        user, paper_id, project_id, strategy_type, socket_id
    )
    if "error" in result:
        return json_response(result, status=result.pop("status", 400))
    return json_response(result)


@assistant_bp.route(
    "/reprocess_project/<project_id:str>", methods=["POST"], name="reprocess_project"
)
@docs.reprocess_project
@require_jwt
@error_handler
async def reprocess_project(request: Request, project_id: str):
    """
    Reprocess all papers in a project.
    """
    user = request.ctx.user
    data = request.json
    strategy_type = data.get("strategy_type", "assistant_api")
    socket_id = data.get("sid")

    result = reprocess_project_controller(user, project_id, strategy_type, socket_id)
    if "error" in result:
        return json_response(result, status=result.pop("status", 400))
    return json_response(result)
