"""OpenAPI decorators for result routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Results",
    {
        "evaluate_repeatability": "Trigger repeatability evaluation for a feature",
        "run_feature_extraction": "Run a single feature extraction on a paper",
        "get_feature_evaluations": "List repeatability evaluations for a feature",
        "get_repeatability_result": "Get a repeatability result by ID",
    },
)
