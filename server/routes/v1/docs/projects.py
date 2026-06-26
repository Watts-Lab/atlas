"""OpenAPI documentation for project routes."""

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

_PROJECT_ID = path_param("project_id", "The project's id (from `GET /projects/`).")

__getattr__ = make_getattr(
    "Projects",
    {
        "project": Endpoint(
            summary="List or create projects",
            description=(
                "A project is a review workspace that groups papers and a feature "
                "schema. Its `project_id` is required by nearly every other "
                "project-scoped endpoint.\n\n"
                "- **GET** — list all projects owned by the authenticated user. "
                "Each entry includes id, title, description, `updated_at`, paper "
                "ids, and a summary of results, plus the user's recently-viewed "
                "projects.\n"
                "- **POST** — create a new project and return its `project_id`."
            ),
            body=json_body(
                {
                    "project_name": {
                        "type": "string",
                        "description": "Required. Human-readable project name.",
                    },
                    "project_description": {
                        "type": "string",
                        "description": "Optional short description of the review scope.",
                    },
                    "project_features": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of feature ids to attach on creation.",
                    },
                },
                required=["project_name"],
                example={
                    "project_name": "Opioid RCTs 2024",
                    "project_description": "Randomized trials of opioid tapering.",
                },
            ),
            responses=[
                response("200", "List of projects (GET)."),
                response(
                    "201",
                    "Project created (POST).",
                    json_content(
                        obj(
                            {
                                "message": {"type": "string"},
                                "project_id": {"type": "string"},
                            }
                        ),
                        example={
                            "message": "Project created.",
                            "project_id": "665f1c2a9b3e4d0012ab34cd",
                        },
                    ),
                ),
                response("400", "`project_name` was missing."),
            ],
        ),
        "project_detail": Endpoint(
            summary="Get, update, or delete a project",
            description=(
                "- **GET** — retrieve a single project with its configuration and "
                "results. Also records the project as recently viewed.\n"
                "- **PUT** — update the project's name, description, and/or the "
                "extraction `project_prompt` (the system instruction the LLM uses "
                "when extracting features from this project's papers). Only the "
                "fields you send are changed.\n"
                "- **DELETE** — permanently delete the project."
            ),
            parameters=[_PROJECT_ID],
            body=json_body(
                {
                    "project_name": {"type": "string"},
                    "project_description": {"type": "string"},
                    "project_prompt": {
                        "type": "string",
                        "description": "Extraction system prompt for this project.",
                    },
                }
            ),
            responses=[
                response("200", "Project payload, or update/delete confirmation."),
                response("404", "Project not found."),
            ],
        ),
        "project_results": Endpoint(
            summary="List or delete project results",
            description=(
                "Results are the extracted feature values for a project's papers.\n\n"
                "- **GET** — list results. By default only the latest version per "
                "paper is returned; pass `include_versions=true` to include the full "
                "version history. Each result carries metadata fields prefixed with "
                "an underscore (`_version`, `_is_latest`, `_result_id`, "
                "`_paper_id`).\n"
                "- **DELETE** — delete specific results by id. When a deleted result "
                "was the latest version, the previous version is automatically "
                "promoted to latest. Only the project owner may delete."
            ),
            parameters=[
                _PROJECT_ID,
                query_param(
                    "include_versions",
                    "GET only. `true` to include historical result versions.",
                    schema={"type": "boolean", "default": False},
                ),
            ],
            body=json_body(
                {
                    "result_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "DELETE only. Ids of the results to delete.",
                    }
                },
                example={"result_ids": ["665f1c2a9b3e4d0012ab34cd"]},
            ),
            responses=[
                response("200", "Results list, or deletion confirmation."),
                response("400", "No result ids provided (DELETE)."),
                response("403", "Caller is not the project owner (DELETE)."),
                response("404", "Project or results not found."),
            ],
        ),
        "score_csv_endpoint": Endpoint(
            summary="Score a CSV file or poll scoring task status",
            description=(
                "- **POST** — upload a CSV file (multipart form field `file`) to "
                "score it against the project. Enqueues a background task and "
                "returns its `task_id`.\n"
                "- **GET** — poll a scoring task's status and result using "
                "`task_id`."
            ),
            parameters=[
                _PROJECT_ID,
                query_param("task_id", "GET only. The scoring task id to poll."),
            ],
            body={
                "multipart/form-data": {
                    "schema": obj(
                        {
                            "file": {
                                "type": "string",
                                "format": "binary",
                                "description": "The CSV file to score.",
                            }
                        },
                        required=["file"],
                    )
                }
            },
            responses=[
                response(
                    "200",
                    "Task started (POST) or task status (GET).",
                    json_content(
                        obj(
                            {
                                "task_id": {"type": "string"},
                                "status": {"type": "string"},
                                "message": {"type": "string"},
                            }
                        )
                    ),
                ),
                response("400", "No CSV file (POST) or missing `task_id` (GET)."),
            ],
        ),
        "get_feature_scores": Endpoint(
            summary="Get ground-truth feature scores for a project",
            description=(
                "Return the per-feature ground-truth quality scores recorded for "
                "this project, including the feature identifier, score, and the "
                "paper/result ids each score was computed from."
            ),
            parameters=[_PROJECT_ID],
            responses=[
                response(
                    "200",
                    "Feature scores retrieved.",
                    json_content(
                        obj(
                            {
                                "message": {"type": "string"},
                                "feature_scores": {
                                    "type": "array",
                                    "items": {"type": "object"},
                                },
                            }
                        )
                    ),
                ),
            ],
        ),
        "project_features": Endpoint(
            summary="Get, attach, or detach features on a project",
            description=(
                "Manage which features make up a project's extraction schema.\n\n"
                "- **GET** — list the features currently attached to the project.\n"
                "- **POST** — attach existing features by id (`feature_ids`).\n"
                "- **DELETE** — detach features by id (`feature_ids`).\n\n"
                "Attaching or detaching does not re-extract existing papers — "
                "reprocess the project afterwards if you want updated results."
            ),
            parameters=[_PROJECT_ID],
            body=json_body(
                {
                    "feature_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "POST/DELETE only. Feature ids to attach/detach.",
                    }
                },
                example={"feature_ids": ["665f1c2a9b3e4d0012ab34cd"]},
            ),
            responses=[
                response("200", "Feature list (GET) or detach confirmation (DELETE)."),
                response("201", "Features attached (POST)."),
            ],
        ),
    },
)
