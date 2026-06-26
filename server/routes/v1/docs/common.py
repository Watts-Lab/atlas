"""Declarative OpenAPI helpers used by the route documentation modules.

The goal of this package is to keep the route handlers themselves clean: the
handlers only carry a single ``@docs.<name>`` decorator, while every piece of
human/LLM-facing documentation (summaries, descriptions, request bodies, path
and query parameters, response shapes, security) lives here.

Each docs module exposes its endpoints lazily via ``make_getattr``. A spec can
be either:

* a plain ``str`` — used as the summary (terse endpoints), or
* an :class:`Endpoint` — the full description, body, params and responses.

Everything is converted into ``sanic_ext`` OpenAPI decorators at attribute
access time, so ``from routes.v1.docs import projects as docs`` then
``@docs.project`` keeps working unchanged.
"""

from dataclasses import dataclass, field
from typing import Any, Optional

from sanic_ext import openapi

JSON = "application/json"

# A permissive object schema used whenever we only want to say "JSON object".
GENERIC_JSON_RESPONSE = {
    JSON: {
        "schema": {
            "type": "object",
            "additionalProperties": True,
        }
    }
}


# ---------------------------------------------------------------------------
# Schema / content builders
# ---------------------------------------------------------------------------
def obj(
    properties: dict[str, Any],
    *,
    required: Optional[list[str]] = None,
    additional: bool = True,
) -> dict:
    """Build a JSON-Schema ``object`` node from a properties mapping."""
    schema: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    if not additional:
        schema["additionalProperties"] = False
    return schema


def json_content(schema: dict, example: Any = None) -> dict:
    """Wrap a JSON-Schema node as an ``application/json`` content block."""
    content: dict[str, Any] = {JSON: {"schema": schema}}
    if example is not None:
        content[JSON]["example"] = example
    return content


def json_body(
    properties: dict[str, Any],
    *,
    required: Optional[list[str]] = None,
    example: Any = None,
) -> dict:
    """Shorthand for a JSON request body described by its properties."""
    return json_content(obj(properties, required=required), example=example)


def multipart_body(
    properties: dict[str, Any], *, required: Optional[list[str]] = None
) -> dict:
    """Build a ``multipart/form-data`` request body (file uploads)."""
    schema = obj(properties, required=required)
    return {"multipart/form-data": {"schema": schema}}


# ---------------------------------------------------------------------------
# Parameter / response builders
# ---------------------------------------------------------------------------
def path_param(name: str, description: str, schema: Optional[dict] = None) -> dict:
    return {
        "name": name,
        "location": "path",
        "required": True,
        "description": description,
        "schema": schema or {"type": "string"},
    }


def query_param(
    name: str,
    description: str,
    *,
    required: bool = False,
    schema: Optional[dict] = None,
) -> dict:
    return {
        "name": name,
        "location": "query",
        "required": required,
        "description": description,
        "schema": schema or {"type": "string"},
    }


def response(status, description: str, content: Optional[dict] = None) -> dict:
    # Coerce numeric statuses to int so response keys are consistent with
    # sanic-ext (which keys the responses dict by the raw status value).
    if isinstance(status, str) and status.isdigit():
        status = int(status)
    return {
        "status": status,
        "description": description,
        "content": content or GENERIC_JSON_RESPONSE,
    }


# ---------------------------------------------------------------------------
# Endpoint specification
# ---------------------------------------------------------------------------
@dataclass
class Endpoint:
    """A complete OpenAPI description for one route handler.

    ``description`` accepts Markdown and is the richest field — it is the direct
    analogue of an MCP tool docstring and is where multi-method handlers explain
    what each verb does.
    """

    summary: str
    description: str = ""
    body: Optional[dict] = None
    parameters: list[dict] = field(default_factory=list)
    responses: list[dict] = field(default_factory=list)
    secured: Optional[bool] = None  # None -> inherit the module/tag default
    operation_id: Optional[str] = None
    deprecated: bool = False


# ---------------------------------------------------------------------------
# Decorator assembly
# ---------------------------------------------------------------------------
def _security_layers() -> list:
    return [
        openapi.secured("cookieAuth"),
        openapi.secured("apiKeyHeader"),
        openapi.response(
            401,
            GENERIC_JSON_RESPONSE,
            description="Unauthorized — missing, invalid, or revoked credentials.",
        ),
    ]


def _build(spec: Endpoint, tag: str, secured_default: bool):
    secured = spec.secured if spec.secured is not None else secured_default

    responses = list(spec.responses)
    if not any(r.get("status") in (200, 201, 202) for r in responses):
        responses.append(response(200, "Successful response."))

    def decorate(handler):
        # `openapi.definition` applies summary/description/tag/body/params/
        # responses in one pass. Only the body branch wraps the handler (the
        # standard sanic-ext passthrough); metadata-only endpoints are untouched.
        handler = openapi.definition(
            summary=spec.summary,
            description=spec.description or None,
            tag=tag,
            operation=spec.operation_id,
            deprecated=spec.deprecated,
            body=spec.body,
            parameter=spec.parameters or None,
            response=responses,
        )(handler)

        if secured:
            # Two separate `secured` calls => "cookieAuth OR apiKeyHeader".
            for layer in _security_layers():
                handler = layer(handler)

        return handler

    return decorate


def _humanize(name: str) -> str:
    return name.replace("_", " ").capitalize()


def make_getattr(
    tag: str,
    specs: Optional[dict[str, Any]] = None,
    *,
    secured: bool = True,
    secured_by_name: Optional[dict[str, bool]] = None,
):
    """Build a module-level ``__getattr__`` that yields endpoint decorators.

    ``specs`` maps handler names to either a summary string or an
    :class:`Endpoint`. Unknown names fall back to a humanized summary so a route
    is always documented, even before its spec is filled in.
    """
    specs = specs or {}
    secured_by_name = secured_by_name or {}

    def __getattr__(name: str):
        spec = specs.get(name)
        if spec is None:
            spec = Endpoint(summary=_humanize(name))
        elif isinstance(spec, str):
            spec = Endpoint(summary=spec)
        elif not isinstance(spec, Endpoint):
            raise TypeError(
                f"Doc spec for {name!r} must be a str or Endpoint, "
                f"got {type(spec).__name__}."
            )

        secured_default = secured_by_name.get(name, secured)
        return _build(spec, tag, secured_default)

    return __getattr__
