"""OpenAPI decorators for paper routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Papers",
    {
        "update_paper_results": "Reprocess a single paper",
        "batch_update_papers": "Reprocess multiple papers in a project",
    },
)
