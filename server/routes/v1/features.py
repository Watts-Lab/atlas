"""
This module contains the routes for the features API.
"""

from controllers.features import (
    create_feature,
    delete_feature_controller,
    list_all_features,
    update_feature_controller,
)
from routes.auth import require_jwt
from routes.error_handler import error_handler
from routes.v1.docs import features as docs
from sanic import Blueprint, Request
from sanic.response import json as json_response

features_bp = Blueprint("features", url_prefix="/features")


@features_bp.route("/", methods=["GET", "POST"], name="features_list")
@docs.features_list
@require_jwt
@error_handler
async def features_list(request: Request):
    """
    A protected route for listing or creating features.
    """
    user = request.ctx.user

    if request.method == "GET":
        project_id = request.args.get("project_id")
        result = list_all_features(user, project_id)
        return json_response(result)

    if request.method == "POST":
        result = create_feature(user, request.json)
        return json_response(result, status=201)


@features_bp.route(
    "/<feature_id:str>", methods=["DELETE", "PUT"], name="feature_detail"
)
@docs.feature_detail
@require_jwt
@error_handler
async def feature_detail(request: Request, feature_id: str):
    """
    A protected route for deleting or updating a feature.
    """
    user = request.ctx.user

    if request.method == "DELETE":
        result = delete_feature_controller(user, feature_id)
        status = result.pop("status", 200)
        return json_response(result, status=status)

    if request.method == "PUT":
        result = update_feature_controller(user, feature_id, request.json)
        status = result.pop("status", 200)
        return json_response(result, status=status)
