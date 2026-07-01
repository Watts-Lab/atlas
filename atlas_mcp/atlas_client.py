"""HTTP bridge from MCP tools to the Atlas REST API.

The caller's Atlas API key is extracted from the incoming MCP request headers
and forwarded to the Atlas API as ``X-API-Key``. We never store the key; it
lives only for the duration of a single forwarded request.
"""

from pathlib import Path
from typing import Any, Optional

import httpx
from fastmcp.exceptions import ToolError
from fastmcp.server.dependencies import get_http_headers

from . import config


def _extract_api_key() -> str:
    """Return the Atlas API key for the current request.

    HTTP transport: read it from the incoming request headers — either
      * ``Authorization: Bearer atlas_...``  (MCP-idiomatic), or
      * ``X-API-Key: atlas_...``             (direct).

    Stdio transport (local install): there are no HTTP headers, so fall back to
    the ``ATLAS_API_KEY`` environment variable set in the MCP client config.
    """
    # include_all=True so the Authorization header is not filtered out.
    headers = get_http_headers(include_all=True)

    auth = headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token:
            return token

    api_key = headers.get("x-api-key")
    if api_key and api_key.strip():
        return api_key.strip()

    if config.ATLAS_API_KEY:
        return config.ATLAS_API_KEY

    raise ToolError(
        "No Atlas API key supplied. Configure your MCP client to send an "
        "'Authorization: Bearer <atlas_key>' header (hosted server) or set the "
        "ATLAS_API_KEY environment variable (local stdio server). Generate a "
        "key at Settings -> API Keys in the Atlas web app."
    )


async def atlas_request(
    method: str,
    path: str,
    *,
    params: Optional[dict] = None,
    json: Optional[dict] = None,
) -> Any:
    """Forward a request to the Atlas API and return the parsed JSON body.

    Raises :class:`ToolError` with a model-friendly message on any failure so
    the connected LLM can react instead of crashing the tool call.
    """
    api_key = _extract_api_key()
    url = f"{config.ATLAS_API_URL}{path}"

    try:
        async with httpx.AsyncClient(timeout=config.ATLAS_REQUEST_TIMEOUT) as client:
            response = await client.request(
                method,
                url,
                params=params,
                json=json,
                headers={"X-API-Key": api_key},
            )
    except httpx.RequestError as exc:
        raise ToolError(f"Could not reach the Atlas API: {exc}") from exc

    if response.status_code == 401:
        raise ToolError(
            "Atlas rejected the API key (401). It may be invalid, inactive, or revoked."
        )
    if response.status_code >= 400:
        raise ToolError(
            f"Atlas API error {response.status_code}: {response.text[:500]}"
        )

    try:
        return response.json()
    except ValueError:
        return {"raw": response.text}


def _handle_response(response: httpx.Response) -> Any:
    """Map an Atlas HTTP response to a parsed body or a model-friendly error."""
    if response.status_code == 401:
        raise ToolError(
            "Atlas rejected the API key (401). It may be invalid, inactive, or revoked."
        )
    if response.status_code >= 400:
        raise ToolError(
            f"Atlas API error {response.status_code}: {response.text[:500]}"
        )

    try:
        return response.json()
    except ValueError:
        return {"raw": response.text}


async def atlas_upload(
    path: str,
    *,
    files: list,
    data: Optional[dict] = None,
) -> Any:
    """Forward a multipart/form-data POST (file upload) to the Atlas API.

    Used only by the local (stdio) server, where a tool can read a PDF off the
    user's disk and stream it to the API directly — no presigned URL or curl.

    Args:
        path: API path beneath the versioned base URL (e.g. ``/assistant/add_paper``).
        files: httpx-style file tuples, ``(field_name, (filename, content, mime))``.
        data: Additional form fields to send alongside the file(s).
    """
    api_key = _extract_api_key()
    url = f"{config.ATLAS_API_URL}{path}"

    try:
        async with httpx.AsyncClient(timeout=config.ATLAS_UPLOAD_TIMEOUT) as client:
            response = await client.post(
                url,
                files=files,
                data=data,
                headers={"X-API-Key": api_key},
            )
    except httpx.RequestError as exc:
        raise ToolError(f"Could not reach the Atlas API: {exc}") from exc

    return _handle_response(response)


def read_local_pdf(file_path: str) -> tuple[str, bytes]:
    """Read and validate a PDF from the user's local filesystem (stdio only).

    Returns ``(filename, content)``. Refuses to run on the hosted HTTP server,
    where "local" would mean the server's own filesystem — a security boundary.
    Enforces the same size cap and PDF magic-byte check the API applies.
    """
    if not config.ALLOW_LOCAL_FILES:
        raise ToolError(
            "Local file uploads are only available when the Atlas MCP server "
            "runs on your own machine (stdio transport). Install it locally and "
            "configure your MCP client to launch it with MCP_TRANSPORT=stdio and "
            "your ATLAS_API_KEY. On the hosted server, use create_paper_upload."
        )

    path = Path(file_path).expanduser()
    if not path.is_file():
        raise ToolError(f"No file found at '{file_path}'.")

    size = path.stat().st_size
    if size == 0:
        raise ToolError(f"The file at '{file_path}' is empty.")
    if size > config.ATLAS_MAX_UPLOAD_BYTES:
        limit_mb = config.ATLAS_MAX_UPLOAD_BYTES // (1024 * 1024)
        raise ToolError(f"File exceeds the {limit_mb}MB limit.")

    content = path.read_bytes()
    if not content.startswith(b"%PDF"):
        raise ToolError(
            f"The file at '{file_path}' does not look like a PDF (missing %PDF header)."
        )
    return path.name, content
