"""Atlas MCP server.

A thin Model Context Protocol (MCP) adapter that exposes a subset of the
Atlas REST API (``/api/v1``) as MCP tools over the Streamable HTTP transport.

Design principles
------------------
* **No duplicated business logic.** Every tool forwards to the existing Atlas
  REST API; this package never imports Sanic controllers, DB models, or Celery.
* **Auth is delegated.** The caller's Atlas API key (``atlas_...``) is read from
  the incoming request and forwarded to the API as the ``X-API-Key`` header.
  The existing :func:`controllers.api_keys.authenticate_api_key` does the work.
"""
