"""OpenAPI documentation for paper routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_body,
    json_content,
    make_getattr,
    obj,
    path_param,
    response,
)

_STRATEGY = {
    "type": "string",
    "description": "Extraction strategy. Defaults to `assistant_api`.",
}

__getattr__ = make_getattr(
    "Papers",
    {
        "update_paper_results": Endpoint(
            summary="Reprocess a single paper",
            description=(
                "Re-run extraction for one paper, typically after its project's "
                "features changed. The caller must own both the paper and the "
                "project. Returns the new extraction `task_id`."
            ),
            parameters=[path_param("paper_id", "The id of the paper to reprocess.")],
            body=json_body(
                {
                    "project_id": {
                        "type": "string",
                        "description": "The project to reprocess the paper against.",
                    },
                    "strategy_type": _STRATEGY,
                    "sid": {
                        "type": "string",
                        "description": "Optional Socket.IO id for live progress.",
                    },
                },
                required=["project_id"],
            ),
            responses=[
                response(
                    "200",
                    "Reprocessing started.",
                    json_content(
                        obj(
                            {
                                "message": {"type": "string"},
                                "task_id": {"type": "string"},
                                "paper_id": {"type": "string"},
                            }
                        )
                    ),
                ),
                response("400", "Missing `project_id`."),
                response("403", "Caller does not own the paper or project."),
                response("404", "Paper or project not found."),
            ],
        ),
        "batch_update_papers": Endpoint(
            summary="Reprocess multiple papers in a project",
            description=(
                "Re-run extraction for many papers in a project at once. If "
                "`paper_ids` is omitted, every paper in the project is reprocessed. "
                "Returns a per-paper mapping of task ids (or per-paper errors)."
            ),
            body=json_body(
                {
                    "project_id": {"type": "string", "description": "The project id."},
                    "paper_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Papers to reprocess; omit to reprocess all.",
                    },
                    "strategy_type": _STRATEGY,
                },
                required=["project_id"],
            ),
            responses=[
                response(
                    "200",
                    "Batch reprocessing started.",
                    json_content(
                        obj(
                            {
                                "message": {"type": "string"},
                                "tasks": {"type": "object"},
                            }
                        )
                    ),
                ),
                response("400", "Missing `project_id`."),
                response("404", "Project not found or unauthorized."),
            ],
        ),
    },
)
