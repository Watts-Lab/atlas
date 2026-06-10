"""OpenAPI decorators for user routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Users",
    {"user_papers": "List the authenticated user's papers"},
)
