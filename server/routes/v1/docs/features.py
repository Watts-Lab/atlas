"""OpenAPI documentation for feature routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_body,
    json_content,
    make_getattr,
    obj,
    path_param,
    query_param,
    response,
)

_FEATURE_BODY = json_body(
    {
        "feature_name": {
            "type": "string",
            "description": 'Human-readable name, e.g. "Sample Size".',
        },
        "feature_identifier": {
            "type": "string",
            "description": "Stable snake_case id, unique among the user's features.",
        },
        "feature_prompt": {
            "type": "string",
            "description": "Instruction the LLM uses to extract this feature.",
        },
        "feature_type": {
            "type": "string",
            "enum": ["text", "number", "boolean", "enum", "parent"],
            "description": (
                "Data type. Use `enum` for a fixed set of options and `parent` "
                "for a grouping node with no value of its own."
            ),
        },
        "feature_description": {"type": "string"},
        "feature_parent": {
            "type": "string",
            "description": "Optional identifier of a parent feature to nest under.",
        },
        "enum_options": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Required when `feature_type` is `enum`.",
        },
        "is_shared": {
            "type": "boolean",
            "description": "Whether the feature is shared across the user's projects.",
        },
    },
    required=["feature_name", "feature_identifier", "feature_prompt"],
    example={
        "feature_name": "Study design",
        "feature_identifier": "study_design",
        "feature_prompt": "What is the study design (RCT, cohort, etc.)?",
        "feature_type": "enum",
        "enum_options": ["RCT", "Cohort", "Case-control", "Other"],
    },
)

__getattr__ = make_getattr(
    "Features",
    {
        "features_list": Endpoint(
            summary="List or create features",
            description=(
                "A feature is a single structured field extracted from each paper.\n\n"
                "- **GET** — list the user's feature definitions. Pass "
                "`project_id` to scope the list to one project's schema.\n"
                "- **POST** — create a new feature definition. The new feature is "
                "not attached to any project until you add it via "
                "`POST /projects/{project_id}/features`."
            ),
            parameters=[
                query_param(
                    "project_id", "GET only. Scope the list to a project's features."
                ),
            ],
            body=_FEATURE_BODY,
            responses=[
                response("200", "Feature list (GET)."),
                response("201", "Feature created (POST)."),
            ],
        ),
        "feature_detail": Endpoint(
            summary="Update or delete a feature",
            description=(
                "- **PUT** — update a feature definition (any subset of the fields "
                "accepted by create).\n"
                "- **DELETE** — delete the feature definition."
            ),
            parameters=[path_param("feature_id", "The id of the feature.")],
            body=json_content(
                obj(
                    {
                        "feature_name": {"type": "string"},
                        "feature_prompt": {"type": "string"},
                        "feature_description": {"type": "string"},
                        "feature_type": {
                            "type": "string",
                            "enum": ["text", "number", "boolean", "enum", "parent"],
                        },
                        "enum_options": {"type": "array", "items": {"type": "string"}},
                        "is_shared": {"type": "boolean"},
                    }
                )
            ),
            responses=[
                response("200", "Feature updated or deleted."),
                response("404", "Feature not found."),
            ],
        ),
    },
)
