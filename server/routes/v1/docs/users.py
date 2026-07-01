"""OpenAPI documentation for user routes."""

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

__getattr__ = make_getattr(
    "Users",
    {
        "user_papers": Endpoint(
            summary="List the authenticated user's papers",
            description=(
                "Return the papers belonging to the authenticated user, across all "
                "their projects, with pagination."
            ),
            parameters=[
                query_param(
                    "page",
                    "1-based page number. Defaults to 1.",
                    schema={"type": "integer", "default": 1},
                ),
                query_param(
                    "page_size",
                    "Papers per page. Defaults to 10.",
                    schema={"type": "integer", "default": 10},
                ),
            ],
            responses=[response("200", "Paginated list of the user's papers.")],
        ),
        "user_settings": Endpoint(
            summary="Get usage budget and provider-key status",
            description=(
                "Return the authenticated user's monthly platform budget in USD "
                "(`limit_usd`, `used_usd`, `remaining_usd`, and the current period "
                "start) along with whether they have configured their own "
                "OpenAI/Anthropic keys.\n\n"
                "The budget is only consumed when extraction runs on Atlas' "
                "platform keys; bring-your-own-key extractions are not metered. "
                "Cookie session required (not accessible via API key)."
            ),
            responses=[
                response(
                    "200",
                    "Usage and provider-key status.",
                    json_content(
                        obj(
                            {
                                "usage": {"type": "object"},
                                "provider_keys": {"type": "object"},
                            }
                        )
                    ),
                ),
            ],
        ),
        "user_provider_keys": Endpoint(
            summary="Set or remove a bring-your-own provider key",
            description=(
                "Manage the user's own LLM provider API key for `openai` or "
                "`anthropic`.\n\n"
                "- **PUT** — store a key. It is encrypted at rest; only a masked "
                "prefix (e.g. `sk-...ab12`) is ever returned. While a key is set, "
                "the user's extractions use it and do **not** consume the monthly "
                "budget.\n"
                "- **DELETE** — remove the stored key; extractions fall back to "
                "Atlas' platform keys (and resume consuming the monthly budget).\n\n"
                "Cookie session required (not accessible via API key)."
            ),
            parameters=[
                path_param(
                    "provider",
                    "The provider to configure: `openai` or `anthropic`.",
                    schema={"type": "string", "enum": ["openai", "anthropic"]},
                ),
            ],
            body=json_body(
                {
                    "api_key": {
                        "type": "string",
                        "description": "PUT only. The provider API key to store.",
                    }
                },
                required=["api_key"],
                example={"api_key": "sk-..."},
            ),
            responses=[
                response("200", "Key stored or removed; masked confirmation."),
                response("400", "Unsupported provider or invalid key."),
            ],
        ),
    },
)
