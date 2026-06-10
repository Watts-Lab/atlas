"""OpenAPI decorators for health routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Health",
    {"health_check": "Health check"},
    secured=False,
)
