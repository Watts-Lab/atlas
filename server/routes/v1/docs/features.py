"""OpenAPI decorators for feature routes."""

from routes.v1.docs.common import make_getattr

__getattr__ = make_getattr(
    "Features",
    {
        "features_list": "List or create features",
        "feature_detail": "Update or delete a feature",
    },
)
