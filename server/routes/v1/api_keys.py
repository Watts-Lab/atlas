"""
Routes for API key management.

Endpoints
---------
GET    /v1/api-keys/           List all API keys for the authenticated user.
POST   /v1/api-keys/           Create a new API key.
DELETE /v1/api-keys/<key_id>   Revoke (deactivate) an API key.
                               Pass ``?permanent=true`` to permanently delete it.
"""

from controllers.api_keys import (
    create_api_key,
    delete_api_key,
    list_api_keys,
    revoke_api_key,
)
from database.models.users import User
from routes.auth import require_session
from routes.error_handler import error_handler
from sanic import Blueprint
from sanic import json as json_response
from sanic.request import Request
from sanic_ext import openapi

api_keys_bp = Blueprint("api_keys", url_prefix="/api-keys")


# API key management is session-only (require_session rejects API keys), so these
# endpoints can't be driven by the public API. Hide them from the OpenAPI spec.
@api_keys_bp.route("/", methods=["GET", "POST"], name="api_keys")
@openapi.exclude()
@require_session
@error_handler
async def api_keys(request: Request):
    """
    GET  — Return all API keys belonging to the authenticated user.
           The raw key and key_hash are never included in the response.

    POST — Create a new API key.
           Body: ``{"name": "<label>"}``
           The raw key is returned **once** in this response and cannot be
           retrieved again.
    """
    user: User = request.ctx.user

    if request.method == "GET":
        keys = list_api_keys(user)
        return json_response({"api_keys": keys}, status=200)

    if request.method == "POST":
        body = request.json or {}
        name: str = (body.get("name") or "").strip()

        if not name:
            return json_response(
                {"error": True, "message": "A non-empty 'name' field is required."},
                status=400,
            )

        try:
            result = create_api_key(user=user, name=name)
        except ValueError as exc:
            return json_response({"error": True, "message": str(exc)}, status=400)

        return json_response(
            {
                "message": (
                    "API key created. Copy the key now — it will not be shown again."
                ),
                "api_key": result,
            },
            status=201,
        )


@api_keys_bp.route("/<key_id>", methods=["DELETE"], name="api_key_detail")
@openapi.exclude()
@require_session
@error_handler
async def api_key_detail(request: Request, key_id: str):
    """
    DELETE — Revoke an API key (sets ``is_active = False``).

    The key document is retained for audit purposes. Pass the query parameter
    ``?permanent=true`` to permanently delete the key document instead.
    """
    user: User = request.ctx.user

    permanent = str(request.args.get("permanent", "")).lower() in ("1", "true", "yes")

    try:
        if permanent:
            result = delete_api_key(user=user, key_id=key_id)
        else:
            result = revoke_api_key(user=user, key_id=key_id)
    except ValueError as exc:
        return json_response({"error": True, "message": str(exc)}, status=404)

    return json_response(
        {
            "message": "API key deleted." if permanent else "API key revoked.",
            "api_key": result,
        },
        status=200,
    )
