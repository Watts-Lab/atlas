"""OpenAPI documentation for repeatability/evaluation result routes."""

from routes.v1.docs.common import (
    Endpoint,
    json_body,
    make_getattr,
    path_param,
    response,
)

_FEATURE_ID = path_param("feature_id", "The id of the feature.")

_EVAL_BODY = json_body(
    {
        "paper_id": {"type": "string", "description": "The paper to evaluate against."},
        "project_id": {"type": "string", "description": "The project context."},
        "sid": {
            "type": "string",
            "description": "Optional Socket.IO id for live progress on `/home`.",
        },
    },
    required=["paper_id", "project_id"],
)

__getattr__ = make_getattr(
    "Results",
    {
        "evaluate_repeatability": Endpoint(
            summary="Trigger repeatability evaluation for a feature",
            description=(
                "Run the feature's extraction repeatedly for a paper to measure how "
                "consistent the LLM's output is. Enqueues a background task; "
                "responds `202 Accepted` and emits progress over the WebSocket."
            ),
            parameters=[_FEATURE_ID],
            body=_EVAL_BODY,
            responses=[
                response("202", "Evaluation accepted and running."),
            ],
        ),
        "run_feature_extraction": Endpoint(
            summary="Run a single feature extraction on a paper",
            description=(
                "Extract just this one feature from a single paper (without "
                "reprocessing the whole project). Enqueues a background task and "
                "responds `202 Accepted`."
            ),
            parameters=[_FEATURE_ID],
            body=_EVAL_BODY,
            responses=[
                response("202", "Extraction accepted and running."),
            ],
        ),
        "get_feature_evaluations": Endpoint(
            summary="List repeatability evaluations for a feature",
            description="Return the history of repeatability evaluations for a feature.",
            parameters=[_FEATURE_ID],
            responses=[response("200", "Evaluation history.")],
        ),
        "get_repeatability_result": Endpoint(
            summary="Get a repeatability result by id",
            description="Return the detailed record for a single repeatability result.",
            parameters=[path_param("result_id", "The id of the repeatability result.")],
            responses=[
                response("200", "Repeatability result detail."),
                response("404", "Result not found."),
            ],
        ),
    },
)
