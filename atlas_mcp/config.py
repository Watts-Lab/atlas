"""Runtime configuration for the Atlas MCP server.

All values are environment-driven so the same image runs in dev and prod.
"""

import os

# Base URL of the Atlas REST API (versioned). Inside docker-compose the MCP
# container reaches the backend over the internal network. For a local (stdio)
# install this should point at the public API, e.g.
# https://atlas.seas.upenn.edu/api/v1.
ATLAS_API_URL: str = os.getenv("ATLAS_API_URL", "http://backend:8000/api/v1").rstrip(
    "/"
)

# Transport the server speaks:
#   "http"  (default) — the hosted Streamable HTTP server behind nginx at /mcp.
#                       The caller's API key arrives per-request in headers.
#   "stdio"           — a local install spawned by the user's MCP client. This
#                       enables uploading PDFs by local file path (the hosted
#                       server cannot read the user's disk).
MCP_TRANSPORT: str = os.getenv("MCP_TRANSPORT", "http").strip().lower()

# Local (stdio) mode only: the user's Atlas API key, supplied via env by their
# MCP client config. In HTTP mode the key arrives per-request in headers and
# this is ignored.
ATLAS_API_KEY: str = os.getenv("ATLAS_API_KEY", "").strip()

# Reading PDFs from the local filesystem is only safe when the server runs on
# the user's own machine. Never enable it for the hosted HTTP deployment, or a
# tool call could read arbitrary files off the server.
ALLOW_LOCAL_FILES: bool = MCP_TRANSPORT == "stdio"

# Where the MCP HTTP server binds.
MCP_HOST: str = os.getenv("MCP_HOST", "0.0.0.0")
MCP_PORT: int = int(os.getenv("MCP_PORT", "9000"))

# Path the Streamable HTTP transport is mounted on. Must match the nginx
# `location` block (e.g. https://atlas.seas.upenn.edu/mcp).
MCP_PATH: str = os.getenv("MCP_PATH", "/mcp")

# Run the Streamable HTTP transport in stateless mode. When True the server does
# not keep per-connection session state, so it never returns "session not found"
# (HTTP 404) if a client reuses a session id across a server restart. This makes
# the server robust to restarts and friendly to clients that cache sessions
# (e.g. Zed). Each request is self-contained; per-request SSE streaming (such as
# tool progress) still works. Set to "false" only if you need cross-request
# server-initiated streams tied to a persistent session.
MCP_STATELESS_HTTP: bool = os.getenv("MCP_STATELESS_HTTP", "true").lower() == "true"

# Per-request timeout (seconds) when calling the Atlas API.
ATLAS_REQUEST_TIMEOUT: float = float(os.getenv("ATLAS_REQUEST_TIMEOUT", "60"))

# Longer timeout (seconds) for file uploads / downloads, which can take longer
# than a plain JSON request (PDF transfer + initial server-side handling).
ATLAS_UPLOAD_TIMEOUT: float = float(os.getenv("ATLAS_UPLOAD_TIMEOUT", "180"))

# Cap (bytes) on PDFs the MCP server will download from a URL before forwarding
# them to Atlas. Guards against pulling down unbounded payloads.
ATLAS_MAX_UPLOAD_BYTES: int = int(
    os.getenv("ATLAS_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024))
)
