"""OpenAPI documentation for inclusion-criteria routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_body,
    make_getattr,
    path_param,
    response,
)

_PROJECT_ID = path_param("project_id", "The project's id.")

__getattr__ = make_getattr(
    "Inclusion Criteria",
    {
        "project_inclusion_criteria": Endpoint(
            summary="List or create inclusion criteria for a project",
            description=(
                "An inclusion criterion is a named boolean `formula` over feature "
                "values that decides whether a paper is included in the review.\n\n"
                "- **GET** — list the project's inclusion criteria.\n"
                "- **POST** — create a new criterion."
            ),
            parameters=[_PROJECT_ID],
            body=json_body(
                {
                    "name": {
                        "type": "string",
                        "description": "Required. Criterion name.",
                    },
                    "description": {"type": "string"},
                    "formula": {
                        "type": "string",
                        "description": "Required. Boolean formula over feature values.",
                    },
                },
                required=["name", "formula"],
            ),
            responses=[
                response("200", "Criteria list (GET)."),
                response("201", "Criterion created (POST)."),
                response("400", "Missing `name` or `formula`."),
                response("404", "Project not found."),
            ],
        ),
        "project_inclusion_criteria_detail": Endpoint(
            summary="Update or delete an inclusion criterion",
            description=(
                "- **PUT** — update a criterion's name, description, or formula.\n"
                "- **DELETE** — delete the criterion."
            ),
            parameters=[
                _PROJECT_ID,
                path_param("criteria_id", "The id of the inclusion criterion."),
            ],
            body=json_body(
                {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "formula": {"type": "string"},
                }
            ),
            responses=[
                response("200", "Criterion updated or deleted."),
                response("404", "Criterion not found."),
            ],
        ),
    },
)
