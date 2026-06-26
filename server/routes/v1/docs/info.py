"""Top-level OpenAPI metadata: the API "mental model" and security schemes.

This is the Swagger equivalent of the Atlas MCP server's ``INSTRUCTIONS`` block.
It is deliberately written for a reader (human or LLM) who lands on
``/api/docs`` cold: it explains the domain concepts, the typical workflow, and
how the endpoints relate, so the reader can decide *which* endpoint to call for
a given goal and then read that endpoint's own description for the specifics.

Keeping it here keeps ``api.py`` lean — wire it up with ``register_openapi(app)``.
"""

API_TITLE = "Atlas API"
API_VERSION = "1.0.0"

API_DESCRIPTION = """\
REST API for **Atlas** — a systematic literature review assistant that uses
LLMs to extract structured features from academic papers.

## Domain model

Almost everything in Atlas hangs off these concepts:

- **Project** — a review workspace owned by a user. It groups a set of papers
  and a *feature schema*. Most endpoints are scoped to a project and need its
  `project_id`.
- **Paper** — an academic document (usually a PDF) added to a project. Atlas
  parses it and runs extraction against the project's features.
- **Feature** — a single structured field to extract from each paper (e.g.
  "sample size", "study design", a yes/no condition). A project's set of
  features defines what gets pulled out of every paper. Features have a type
  (`text`, `number`, `boolean`, `enum`, `parent`) and may be nested.
- **Result / Score** — the extracted value of a feature for a given paper,
  produced by the LLM. Results are what users analyze or export. Each
  re-extraction creates a new version; `is_latest` marks the current one.
- **Inclusion criterion** — a named boolean formula over feature values used to
  decide whether a paper is included in the review.
- **Ground truth & repeatability** — human-provided correct values and repeated
  extractions used to evaluate extraction quality.

## How to navigate this API

Discover IDs before using them — **never invent** project, paper, or feature
IDs. A typical end-to-end flow:

1. **Create or pick a project**: `POST /api/v1/projects/` or
   `GET /api/v1/projects/`.
2. **Curate the feature schema**: browse with `GET /api/v1/features/`, create
   with `POST /api/v1/features/`, and attach/detach to a project with
   `GET|POST|DELETE /api/v1/projects/{project_id}/features`.
3. **Add papers** to a project. Two paths:
   - Direct multipart upload: `POST /api/v1/assistant/add_paper`.
   - Presigned upload (large files / SDK): `POST /api/v1/assistant/upload_link`
     to get a URL, `PUT` the bytes there, then
     `POST /api/v1/assistant/upload_complete` to start extraction.
   Both return a `task_id` for the background extraction job.
4. **Track processing**: poll `GET /api/v1/assistant/add_paper?task_id=...`, or
   subscribe to live progress over the WebSocket (see below).
5. **Read results**: `GET /api/v1/projects/{project_id}/results`. Re-run
   extraction after schema/prompt changes with
   `POST /api/v1/assistant/reprocess_paper/{paper_id}` or
   `POST /api/v1/assistant/reprocess_project/{project_id}`.
6. **Evaluate** quality/repeatability under `/api/v1/results/...` and inspect
   ground truth via `GET /api/v1/projects/{project_id}/ground_truth`.

## Base URL

All versioned endpoints live under `/api/v1`, e.g. `POST /api/v1/auth/login`.

## Authentication

Most endpoints require authentication. Two mechanisms are accepted and either
one satisfies a protected endpoint:

### 1. JWT cookie (`cookieAuth`)
After a successful `POST /api/v1/auth/validate`, the server sets an HTTP-only
cookie named **`jwt`** holding a signed JWT. Browsers send it automatically on
same-origin requests.

### 2. API key header (`apiKeyHeader`)
SDK and server-to-server clients may instead send an API key in the
**`X-API-Key`** header. Manage keys under `/api/v1/api-keys` (the raw key is
shown only once, at creation).

Every request acts on behalf of the authenticated user and only ever sees that
user's own projects and data. Protected endpoints are marked with a lock icon;
unauthenticated calls to them return `401 Unauthorized`.

## Real-time progress (WebSocket)

Long-running tasks (paper processing, feature extraction, repeatability
evaluation) emit progress over a Socket.IO connection. Connect to the `/home`
namespace and pass your connection `sid` in the relevant request body to
receive live status updates.

## Async tasks

Endpoints that enqueue background work return a `task_id` (Celery task ID). Use
the matching polling endpoint or the WebSocket events to track completion.
"""


def register_openapi(app) -> None:
    """Attach Atlas' OpenAPI description and security schemes to the app."""
    app.ext.openapi.describe(
        API_TITLE,
        version=API_VERSION,
        description=API_DESCRIPTION,
    )

    # Either scheme satisfies a protected endpoint.
    app.ext.openapi.add_security_scheme(
        "cookieAuth",
        "apiKey",
        location="cookie",
        name="jwt",
    )
    app.ext.openapi.add_security_scheme(
        "apiKeyHeader",
        "apiKey",
        location="header",
        name="X-API-Key",
    )
