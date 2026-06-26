"""OpenAPI documentation for health routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_content,
    make_getattr,
    obj,
    response,
)

__getattr__ = make_getattr(
    "Health",
    {
        "health_check": Endpoint(
            summary="Health check",
            description=(
                "Liveness probe. Returns `200 OK` when the server is running and "
                "the database is connected. Requires no authentication."
            ),
            responses=[
                response(
                    "200",
                    "Service healthy.",
                    json_content(
                        obj({"status": {"type": "string"}}),
                        example={"status": "ok"},
                    ),
                ),
            ],
        ),
    },
    secured=False,
)
