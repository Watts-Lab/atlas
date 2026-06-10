"""OpenAPI decorators for project routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Projects",
    {
        "project": "List or create projects",
        "project_detail": "Get, update, or delete a project",
        "project_results": "List or delete project results",
        "score_csv_endpoint": "Score a CSV file or poll scoring task status",
        "get_feature_scores": "Get ground truth feature scores for a project",
        "project_features": "Get, attach, or detach features on a project",
    },
)
