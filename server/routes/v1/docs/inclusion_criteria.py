"""OpenAPI decorators for inclusion-criteria routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Inclusion Criteria",
    {
        "project_inclusion_criteria": "List or create inclusion criteria for a project",
        "project_inclusion_criteria_detail": "Update or delete an inclusion criterion",
    },
)

