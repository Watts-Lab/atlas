"""Small OpenAPI decorator helpers used by the route modules."""

from sanic_ext import openapi

GENERIC_JSON_RESPONSE = {
    "application/json": {
        "schema": {
            "type": "object",
            "additionalProperties": True,
        }
    }
}


def _humanize(name: str) -> str:
    return name.replace("_", " ").capitalize()


def _compose(*decorators):
    def decorate(handler):
        for decorator in reversed(decorators):
            handler = decorator(handler)
        return handler

    return decorate


def endpoint(summary: str, tag: str, secured: bool = True):
    decorators = [
        openapi.summary(summary),
        openapi.tag(tag),
        openapi.response(
            200,
            GENERIC_JSON_RESPONSE,
            description="Successful response.",
        ),
    ]

    if secured:
        decorators.extend(
            [
                openapi.secured("cookieAuth"),
                openapi.secured("apiKeyHeader"),
                openapi.response(
                    401,
                    GENERIC_JSON_RESPONSE,
                    description="Unauthorized.",
                ),
            ]
        )

    return _compose(*decorators)


def make_getattr(
    tag: str,
    summaries: dict[str, str] | None = None,
    secured: bool = True,
    secured_by_name: dict[str, bool] | None = None,
):
    summaries = summaries or {}
    secured_by_name = secured_by_name or {}

    def __getattr__(name: str):
        return endpoint(
            summaries.get(name, _humanize(name)),
            tag,
            secured=secured_by_name.get(name, secured),
        )

    return __getattr__
