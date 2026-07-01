"""
This module contains the user self-service routes: papers, usage budget, and
bring-your-own LLM provider keys.
"""

from controllers.papers import get_user_papers_controller
from controllers.user_settings import (
    delete_provider_key,
    get_settings,
    set_provider_key,
)
from routes.auth import require_jwt, require_session
from routes.error_handler import error_handler
from routes.v1.docs import users as docs
from sanic import Blueprint, Request
from sanic.response import json as json_response

users_bp = Blueprint("users", url_prefix="/user")

_VALID_PROVIDERS = ("openai", "anthropic")


@users_bp.route("/papers", methods=["GET"], name="user_papers")
@docs.user_papers
@require_jwt
@error_handler
async def user_papers(request: Request):
    """
    A protected route that fetches the user's papers, supporting pagination.
    """
    user = request.ctx.user
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 10))

    result = get_user_papers_controller(user, page, page_size)
    return json_response(result)


@users_bp.route("/settings", methods=["GET"], name="user_settings")
@docs.user_settings
@require_session
@error_handler
async def user_settings(request: Request):
    """Return the user's monthly usage snapshot and BYO-key status."""
    user = request.ctx.user
    return json_response(get_settings(user))


@users_bp.route(
    "/provider-keys/<provider>", methods=["PUT", "DELETE"], name="user_provider_keys"
)
@docs.user_provider_keys
@require_session
@error_handler
async def user_provider_keys(request: Request, provider: str):
    """Store (PUT) or remove (DELETE) the user's BYO key for a provider."""
    user = request.ctx.user

    if provider not in _VALID_PROVIDERS:
        return json_response(
            {"error": True, "message": f"Unsupported provider: {provider!r}."},
            status=400,
        )

    if request.method == "PUT":
        body = request.json or {}
        raw_key = body.get("api_key", "")
        try:
            result = set_provider_key(user, provider, raw_key)
        except ValueError as exc:
            return json_response({"error": True, "message": str(exc)}, status=400)
        return json_response(result, status=200)

    if request.method == "DELETE":
        try:
            result = delete_provider_key(user, provider)
        except ValueError as exc:
            return json_response({"error": True, "message": str(exc)}, status=400)
        return json_response(result, status=200)
