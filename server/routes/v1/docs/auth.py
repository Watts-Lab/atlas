"""OpenAPI decorators for authentication routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Authentication",
    {
        "login": "Request a magic link login",
        "logout": "Log out the current user",
        "validate": "Validate a magic link token",
        "check_token": "Check JWT validity",
    },
    secured=False,
    secured_by_name={"check_token": True},
)
