"""
WebAuthn (passkey) routes.

Endpoints
---------
POST /v1/webauthn/register/options      Begin passkey registration (session only).
POST /v1/webauthn/register/verify       Finish passkey registration (session only).
POST /v1/webauthn/authenticate/options  Begin usernameless passkey login (public).
POST /v1/webauthn/authenticate/verify   Finish passkey login; sets `jwt` cookie (public).
GET  /v1/webauthn/passkeys              List the user's passkeys (session only).
DELETE /v1/webauthn/passkeys/<id>       Remove a passkey (session only).

Security notes
--------------
- Registration and passkey management require a logged-in session
  (``require_session`` — API keys are rejected, so a leaked key cannot enrol or
  remove passkeys).
- Authentication endpoints are intentionally public: they *produce* a session.
- The ceremony cookie set during ``/options`` is read back on ``/verify`` to
  bind the two requests to the same browser.
"""

from controllers.webauthn import (
    CEREMONY_COOKIE,
    authentication_options,
    authentication_verify,
    delete_passkey,
    list_passkeys,
    registration_options,
    registration_verify,
)
from database.models.users import User
from routes.auth import require_session
from routes.error_handler import error_handler
from sanic import Blueprint
from sanic import json as json_response
from sanic.request import Request
from sanic_ext import openapi

webauthn_bp = Blueprint("webauthn", url_prefix="/webauthn")


# ---------------------------------------------------------------------------
# Registration (session only)
# ---------------------------------------------------------------------------
@webauthn_bp.route("/register/options", methods=["POST"], name="register_options")
@openapi.exclude()
@require_session
@error_handler
async def register_options(request: Request):
    """Return WebAuthn creation options for the authenticated user."""
    user: User = request.ctx.user
    return registration_options(user)


@webauthn_bp.route("/register/verify", methods=["POST"], name="register_verify")
@openapi.exclude()
@require_session
@error_handler
async def register_verify(request: Request):
    """Verify and persist a newly created passkey for the authenticated user."""
    user: User = request.ctx.user
    body = request.json or {}
    credential = body.get("credential") or body
    ceremony_id = request.cookies.get(CEREMONY_COOKIE, "")
    return registration_verify(user, credential, ceremony_id, body)


# ---------------------------------------------------------------------------
# Authentication (public — establishes a session)
# ---------------------------------------------------------------------------
@webauthn_bp.route(
    "/authenticate/options", methods=["POST"], name="authenticate_options"
)
@openapi.exclude()
@error_handler
async def authenticate_options(_request: Request):
    """Return WebAuthn request options for usernameless login."""
    return authentication_options()


@webauthn_bp.route("/authenticate/verify", methods=["POST"], name="authenticate_verify")
@openapi.exclude()
@error_handler
async def authenticate_verify(request: Request):
    """Verify a passkey assertion and, on success, set the `jwt` cookie."""
    body = request.json or {}
    credential = body.get("credential") or body
    ceremony_id = request.cookies.get(CEREMONY_COOKIE, "")
    return authentication_verify(credential, ceremony_id)


# ---------------------------------------------------------------------------
# Passkey management (session only)
# ---------------------------------------------------------------------------
@webauthn_bp.route("/passkeys", methods=["GET"], name="passkeys")
@openapi.exclude()
@require_session
@error_handler
async def passkeys(request: Request):
    """List the authenticated user's registered passkeys."""
    user: User = request.ctx.user
    return json_response({"passkeys": list_passkeys(user)}, status=200)


@webauthn_bp.route("/passkeys/<passkey_id>", methods=["DELETE"], name="passkey_detail")
@openapi.exclude()
@require_session
@error_handler
async def passkey_detail(request: Request, passkey_id: str):
    """Delete one of the authenticated user's passkeys."""
    user: User = request.ctx.user
    try:
        result = delete_passkey(user=user, passkey_id=passkey_id)
    except ValueError as exc:
        return json_response({"error": True, "message": str(exc)}, status=404)
    return json_response({"message": "Passkey removed.", "passkey": result}, status=200)
