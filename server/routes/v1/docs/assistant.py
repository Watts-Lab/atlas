"""OpenAPI decorators for assistant routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Assistant",
    {
        "add_paper": "Upload papers or poll upload task status",
        "reprocess_paper": "Reprocess an existing paper through the assistant",
        "reprocess_project": "Reprocess all papers in a project",
    },
)
