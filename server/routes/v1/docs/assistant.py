"""OpenAPI documentation for assistant (paper ingestion) routes."""

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

_STRATEGY = {
    "type": "string",
    "description": (
        "Extraction strategy. One of `assistant_api`, `openai_json_schema`, or "
        "`anthropic_json_schema`. Defaults to `assistant_api`."
    ),
}
_SID = {
    "type": "string",
    "description": "Optional Socket.IO connection id for live progress on `/home`.",
}

__getattr__ = make_getattr(
    "Assistant",
    {
        "add_paper": Endpoint(
            summary="Upload papers or poll upload task status",
            description=(
                "Primary entry point for adding papers to a project.\n\n"
                "- **POST** — upload one or more PDFs as multipart form-data and "
                "start feature extraction. Send files under `files[]`, plus the "
                "target `project_id`. Returns a `task_id` for the background "
                "extraction job.\n"
                "- **GET** — poll an extraction task's status/result using "
                "`task_id`.\n\n"
                "For large files or SDK/server-to-server use, prefer the presigned "
                "flow: `upload_link` then `upload_complete`."
            ),
            body={
                "multipart/form-data": {
                    "schema": obj(
                        {
                            "files[]": {
                                "type": "array",
                                "items": {"type": "string", "format": "binary"},
                                "description": "One or more PDF files.",
                            },
                            "project_id": {
                                "type": "string",
                                "description": "Target project id.",
                            },
                            "strategy_type": _STRATEGY,
                            "sid": _SID,
                        },
                        required=["files[]", "project_id"],
                    )
                }
            },
            parameters=[
                query_param("task_id", "GET only. The extraction task id to poll."),
            ],
            responses=[
                response(
                    "200",
                    "Upload accepted (POST) or task status (GET).",
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
                response("400", "Missing files or project."),
            ],
        ),
        "create_paper_upload": Endpoint(
            summary="Get a presigned URL to upload a PDF",
            description=(
                "Step 1 of the presigned upload flow. Returns a one-time presigned "
                "URL and an `upload_token`. Upload the PDF bytes directly to the "
                "URL with an HTTP `PUT` (e.g. `curl -X PUT -H 'Content-Type: "
                "application/pdf' --data-binary @paper.pdf '<upload_url>'`), then "
                "call `upload_complete` with the `upload_token` to start "
                "extraction. The bytes go straight to storage and never pass "
                "through this API."
            ),
            body=json_body(
                {
                    "filename": {
                        "type": "string",
                        "description": "Name to store the PDF under (should end in .pdf).",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Target project id.",
                    },
                    "strategy_type": _STRATEGY,
                },
                required=["filename", "project_id"],
            ),
            responses=[
                response(
                    "200",
                    "Presigned upload issued.",
                    json_content(
                        obj(
                            {
                                "upload_url": {"type": "string"},
                                "upload_token": {"type": "string"},
                            }
                        )
                    ),
                ),
                response("400", "Missing filename or project."),
            ],
        ),
        "finalize_paper_upload": Endpoint(
            summary="Start extraction for a presigned-uploaded PDF",
            description=(
                "Step 3 of the presigned upload flow. After `PUT`-ing the PDF to "
                "the presigned URL, call this with the `upload_token` from "
                "`upload_link` to begin feature extraction. Returns a `task_id`."
            ),
            body=json_body(
                {
                    "upload_token": {
                        "type": "string",
                        "description": "The token returned by `upload_link`.",
                    },
                    "project_id": {
                        "type": "string",
                        "description": "Target project id.",
                    },
                    "strategy_type": _STRATEGY,
                    "sid": _SID,
                },
                required=["upload_token", "project_id"],
            ),
            responses=[
                response(
                    "200",
                    "Extraction started.",
                    json_content(obj({"task_id": {"type": "string"}})),
                ),
                response("400", "Missing or invalid upload token."),
            ],
        ),
        "reprocess_paper": Endpoint(
            summary="Reprocess a single paper",
            description=(
                "Re-run feature extraction for one existing paper in a project. "
                "Useful after changing the project's prompt or feature schema. "
                "Returns a `task_id`."
            ),
            parameters=[path_param("paper_id", "The id of the paper to reprocess.")],
            body=json_body(
                {
                    "project_id": {
                        "type": "string",
                        "description": "The project the paper belongs to.",
                    },
                    "strategy_type": _STRATEGY,
                    "sid": _SID,
                },
                required=["project_id"],
            ),
            responses=[
                response(
                    "200",
                    "Reprocessing started.",
                    json_content(obj({"task_id": {"type": "string"}})),
                ),
                response("400", "Missing project id."),
            ],
        ),
        "reprocess_project": Endpoint(
            summary="Reprocess all papers in a project",
            description=(
                "Re-run feature extraction for every paper in a project. Returns a "
                "per-paper mapping of task ids to follow."
            ),
            parameters=[
                path_param("project_id", "The project whose papers to reprocess.")
            ],
            body=json_body(
                {
                    "strategy_type": _STRATEGY,
                    "sid": _SID,
                }
            ),
            responses=[
                response(
                    "200",
                    "Reprocessing started for the project's papers.",
                    json_content(obj({"tasks": {"type": "object"}})),
                ),
            ],
        ),
    },
)
