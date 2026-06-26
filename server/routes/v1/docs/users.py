"""OpenAPI documentation for user routes."""

from routes.v1.docs.common import (
    Endpoint,
    make_getattr,
    query_param,
    response,
)

__getattr__ = make_getattr(
    "Users",
    {
        "user_papers": Endpoint(
            summary="List the authenticated user's papers",
            description=(
                "Return the papers belonging to the authenticated user, across all "
                "their projects, with pagination."
            ),
            parameters=[
                query_param(
                    "page",
                    "1-based page number. Defaults to 1.",
                    schema={"type": "integer", "default": 1},
                ),
                query_param(
                    "page_size",
                    "Papers per page. Defaults to 10.",
                    schema={"type": "integer", "default": 10},
                ),
            ],
            responses=[response("200", "Paginated list of the user's papers.")],
        ),
    },
)
