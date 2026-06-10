"""
Authentication decorators for Sanic route handlers.

Two decorators are provided:

``require_jwt`` validates the caller's identity through one of two mechanisms,
tried in order:

1. **JWT cookie** (``jwt``) — the standard browser-based session token.
2. **API key header** (``X-API-Key``) — a programmatic access token for
   headless clients, SDKs, or CI pipelines.

``require_session`` is stricter: it accepts **only** the JWT cookie and rejects
API keys. It is used for sensitive, self-administration endpoints (such as
creating or revoking API keys) so that a leaked API key cannot be used to mint
or manage further keys.

In all cases a validated :class:`~database.models.users.User` instance is
attached to ``request.ctx.user`` and the mechanism used is recorded on
``request.ctx.auth_method`` (``"jwt"`` or ``"api_key"``) before the wrapped
handler is called.
"""

import logging

import jwt
from controllers.api_keys import authenticate_api_key
from database.models.users import User
from sanic import Request
from sanic.response import json as json_response

logger = logging.getLogger(__name__)


def _resolve_jwt_user(request: Request):
    """
    Decode the ``jwt`` cookie and return ``(user, error_response)``.

    Exactly one element of the tuple is non-``None``. ``error_response`` is a
    ready-to-return Sanic response on failure.
    """
    token = request.cookies.get("jwt")
    if not token:
        return None, None

    secret = request.app.config.JWT_SECRET

    try:
        user_jwt = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None, json_response(
            {"error": True, "message": "Token has expired."}, status=401
        )
    except jwt.InvalidTokenError:
        return None, json_response(
            {"error": True, "message": "Invalid token."}, status=401
        )

    user: User = User.find_one(User.email == user_jwt["email"]).run()  # type: ignore[assignment]

    if not user:
        return None, json_response(
            {"error": True, "message": "User not found."}, status=404
        )

    return user, None


def _make_auth_decorator(handler, *, allow_api_key: bool):
    """
    Build an authentication wrapper around *handler*.

    Parameters
    ----------
    allow_api_key : bool
        When ``True`` the ``X-API-Key`` header is accepted as a fallback to the
        JWT cookie. When ``False`` only the JWT cookie is accepted.
    """

    async def wrapper(request: Request, *args, **kwargs):
        try:
            # --------------------------------------------------------------
            # Path 1: JWT cookie
            # --------------------------------------------------------------
            user, error = _resolve_jwt_user(request)
            if error is not None:
                return error
            if user is not None:
                request.ctx.user = user
                request.ctx.auth_method = "jwt"
                return await handler(request, *args, **kwargs)

            # --------------------------------------------------------------
            # Path 2: X-API-Key header (only if permitted)
            # --------------------------------------------------------------
            if allow_api_key:
                raw_api_key = request.headers.get("X-API-Key") or request.headers.get(
                    "x-api-key"
                )

                if raw_api_key:
                    user = authenticate_api_key(raw_api_key)  # type: ignore[assignment]

                    if not user:
                        return json_response(
                            {"error": True, "message": "Invalid or inactive API key."},
                            status=401,
                        )

                    request.ctx.user = user
                    request.ctx.auth_method = "api_key"
                    return await handler(request, *args, **kwargs)

            # --------------------------------------------------------------
            # Path 3: No (acceptable) credentials
            # --------------------------------------------------------------
            if not allow_api_key and (
                request.headers.get("X-API-Key") or request.headers.get("x-api-key")
            ):
                return json_response(
                    {
                        "error": True,
                        "message": (
                            "This endpoint requires a logged-in session and cannot "
                            "be accessed with an API key."
                        ),
                    },
                    status=403,
                )

            return json_response(
                {"error": True, "message": "No authentication token provided."},
                status=401,
            )

        except Exception as e:  # noqa: BLE001 - last-resort guard
            logger.exception("Unhandled error during authentication: %s", e)
            return json_response(
                {"error": True, "message": "Internal server error."},
                status=500,
            )

    # Preserve the original handler's name so that Sanic's route registry
    # doesn't raise "duplicate route name" errors when the decorator is applied
    # to multiple handlers.
    wrapper.__name__ = handler.__name__

    return wrapper


def require_jwt(handler):
    """
    Authenticate via JWT cookie **or** ``X-API-Key`` header.

    On success ``request.ctx.user`` and ``request.ctx.auth_method`` are set and
    the wrapped *handler* is awaited.
    """
    return _make_auth_decorator(handler, allow_api_key=True)


def require_session(handler):
    """
    Authenticate via the JWT cookie **only** — API keys are rejected.

    Use this for sensitive self-administration endpoints (e.g. API key
    management) so that a compromised API key cannot create or revoke keys.
    A request that presents only an API key receives ``403``.
    """
    return _make_auth_decorator(handler, allow_api_key=False)
