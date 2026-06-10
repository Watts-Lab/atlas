"""
This module contains the routes for repeatability results and evaluations.
"""

from controllers.results import (
    evaluate_repeatability_controller,
    get_feature_evaluations_controller,
    get_repeatability_result_controller,
    run_feature_extraction_controller,
)
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1.docs import results as docs
from sanic import Blueprint, Request
from sanic.response import json as json_response

results_bp = Blueprint("results", url_prefix="/results")


@results_bp.route(
    "/features/<feature_id:str>/evaluate_repeatability",
    methods=["POST"],
    name="evaluate_repeatability",
)
@docs.evaluate_repeatability
@require_jwt
@error_handler
async def evaluate_repeatability(request: Request, feature_id: str):
    """
    Trigger repeatability evaluation for a feature.
    """
    user = request.ctx.user
    paper_id = request.json.get("paper_id")
    project_id = request.json.get("project_id")
    socket_id = request.json.get("sid")

    result = evaluate_repeatability_controller(
        user, feature_id, paper_id, project_id, socket_id
    )
    status = result.pop("status", 202)
    return json_response(result, status=status)


@results_bp.route(
    "/features/<feature_id:str>/extract",
    methods=["POST"],
    name="run_feature_extraction",
)
@docs.run_feature_extraction
@require_jwt
@error_handler
async def run_feature_extraction(request: Request, feature_id: str):
    """
    Run a single extraction for a feature on a paper.
    """
    user = request.ctx.user
    paper_id = request.json.get("paper_id")
    project_id = request.json.get("project_id")
    socket_id = request.json.get("sid")

    result = run_feature_extraction_controller(
        user, feature_id, paper_id, project_id, socket_id
    )
    status = result.pop("status", 202)
    return json_response(result, status=status)


@results_bp.route(
    "/features/<feature_id:str>/evaluations",
    methods=["GET"],
    name="get_feature_evaluations",
)
@docs.get_feature_evaluations
@require_jwt
@error_handler
async def get_feature_evaluations(request: Request, feature_id: str):
    """
    Get evaluation history for a feature.
    """
    result = get_feature_evaluations_controller(feature_id)
    return json_response(result)


@results_bp.route(
    "/repeatability_results/<result_id:str>",
    methods=["GET"],
    name="get_repeatability_result",
)
@docs.get_repeatability_result
@require_jwt
@error_handler
async def get_repeatability_result(request: Request, result_id: str):
    """
    Get detailed information for a repeatability result.
    """
    result = get_repeatability_result_controller(result_id)
    if "error" in result:
        return json_response(result, status=404)
    return json_response(result)
