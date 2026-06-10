"""Atlas MCP server definition and entrypoint.

Run with::

    python -m atlas_mcp.server

The server speaks the MCP Streamable HTTP transport and is intended to sit
behind nginx at ``/mcp`` (e.g. https://atlas.seas.upenn.edu/mcp).
"""

import asyncio
from typing import Literal, Optional

from fastmcp import Context, FastMCP
from fastmcp.exceptions import ToolError

from . import config
from .atlas_client import (
    atlas_request,
    atlas_upload,
    decode_pdf_base64,
    read_local_pdf,
)

# ---------------------------------------------------------------------------
# Server instructions — the "mental model" handed to any connecting LLM.
# This is where Atlas domain concepts are explained so the model knows what
# the tools operate on. Treat it as a prompt: it directly shapes tool usage.
# ---------------------------------------------------------------------------
INSTRUCTIONS = """\
Atlas is a systematic-literature-review assistant. It uses LLMs to extract
structured information from academic papers. Core concepts:

- Project: a review workspace owned by a user. It groups a set of papers and a
  feature schema. Most operations are scoped to a project.
- Paper: an academic document (usually a PDF) added to a project. Atlas parses
  it and runs extraction against the project's features.
- Feature: a single structured field to extract from each paper (for example
  "sample size", "study design", or a yes/no condition). A project's set of
  features defines what gets pulled out of every paper. Features can have types
  and conditions that control how/when they are extracted.
- Result / Score: the extracted value of a feature for a given paper, produced
  by the LLM. Results are what the user ultimately analyzes or exports.
- Ground truth: human-provided correct values used to evaluate extraction
  quality and repeatability.

Authentication: every tool acts on behalf of the user whose Atlas API key was
supplied with the connection. Tools only ever see that user's own projects and
data. If a tool reports a 401, the API key is missing, invalid, or revoked.

Typical workflow:
1. `create_project` to make a review workspace (or `list_projects` to reuse one).
2. Curate the feature schema: `list_features` to browse, `add_project_features`
   / `remove_project_features` to choose what gets extracted, and
   `create_feature` for anything missing.
3. `add_paper` to upload one of the user's PDFs into the project (by local
   file path when the server runs on the user's machine, or base64 for small
   files). This kicks off asynchronous extraction and returns a task id per
   file.
4. `wait_for_papers` to follow processing to completion with live progress, or
   `get_paper_status` to poll a single task yourself.
5. `get_project_results` to read the extracted feature values, and
   `reprocess_paper` / `reprocess_project` to re-run extraction after changing
   the prompt or feature set.

Guidance: prefer listing projects first to discover IDs, then drill into a
specific project's features or results. Never invent project, paper, or feature
IDs — always obtain them from a list call.
"""

mcp = FastMCP(name="Atlas", instructions=INSTRUCTIONS)


# ---------------------------------------------------------------------------
# Tools — thin wrappers over /api/v1. Each docstring is the tool description the
# model sees, so keep them clear and self-contained.
# ---------------------------------------------------------------------------
@mcp.tool
async def list_projects() -> dict:
    """List all of the authenticated user's systematic-review projects.

    Returns each project's id, name, description, and summary metadata. Use the
    returned project ids as input to the other project-scoped tools.
    """
    return await atlas_request("GET", "/projects/")


@mcp.tool
async def get_project(project_id: str) -> dict:
    """Retrieve a single project by its id, including its configuration.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
    """
    return await atlas_request("GET", f"/projects/{project_id}")


@mcp.tool
async def get_project_results(project_id: str) -> dict:
    """Get the extraction results (feature scores) for every paper in a project.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
    """
    return await atlas_request("GET", f"/projects/{project_id}/results")


@mcp.tool
async def list_features(project_id: Optional[str] = None) -> dict:
    """List feature definitions, optionally scoped to a single project.

    Args:
        project_id: Optional project id to filter features by. If omitted, all
            of the user's features are returned.
    """
    params = {"project_id": project_id} if project_id else None
    return await atlas_request("GET", "/features/", params=params)


@mcp.tool
async def create_feature(
    feature_name: str,
    feature_identifier: str,
    feature_prompt: str,
    feature_type: Literal["text", "number", "boolean", "enum", "parent"] = "text",
    feature_description: str = "",
    feature_parent: str = "",
    enum_options: Optional[list[str]] = None,
    is_shared: bool = False,
) -> dict:
    """Create a new feature definition.

    Args:
        feature_name: Human-readable feature name (e.g. "Sample Size").
        feature_identifier: Stable machine identifier, typically snake_case
            (e.g. "sample_size"). Must be unique among the user's features.
        feature_prompt: The instruction the LLM uses to extract this feature
            from a paper.
        feature_type: The data type of the feature. Must be one of "text",
            "number", "boolean", "enum", or "parent" (NOT "string"). Use
            "enum" when the answer is one of a fixed set of options, and
            "parent" for a grouping node with no value of its own.
        feature_description: Optional human-facing description of the feature.
        feature_parent: Optional identifier of a parent feature to nest under.
        enum_options: Required non-empty list of allowed values when
            feature_type is "enum"; otherwise leave unset.
        is_shared: Whether the feature is shared across the user's projects.
    """
    payload: dict = {
        "feature_name": feature_name,
        "feature_identifier": feature_identifier,
        "feature_prompt": feature_prompt,
        "feature_type": feature_type,
        "feature_description": feature_description,
        "feature_parent": feature_parent,
        "is_shared": is_shared,
    }
    if enum_options is not None:
        payload["enum_options"] = enum_options
    return await atlas_request("POST", "/features/", json=payload)


# ---------------------------------------------------------------------------
# Project lifecycle
# ---------------------------------------------------------------------------
@mcp.tool
async def create_project(name: str, description: str = "") -> dict:
    """Create a new systematic-review project owned by the authenticated user.

    Args:
        name: Human-readable project name.
        description: Optional short description of the review's scope.

    Returns the new project's id, which other project-scoped tools require.
    """
    return await atlas_request(
        "POST",
        "/projects/",
        json={"project_name": name, "project_description": description},
    )


@mcp.tool
async def update_project(
    project_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    prompt: Optional[str] = None,
) -> dict:
    """Update a project's name, description, or extraction prompt.

    Only the fields you pass are changed. The prompt is the system instruction
    the LLM uses when extracting features from this project's papers.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
        name: New project name, if changing it.
        description: New description, if changing it.
        prompt: New extraction prompt, if changing it.
    """
    payload: dict = {}
    if name is not None:
        payload["project_name"] = name
    if description is not None:
        payload["project_description"] = description
    if prompt is not None:
        payload["project_prompt"] = prompt
    if not payload:
        raise ToolError("Provide at least one of name, description, or prompt.")
    return await atlas_request("PUT", f"/projects/{project_id}", json=payload)


# ---------------------------------------------------------------------------
# Project feature schema (the set of fields extracted from every paper)
# ---------------------------------------------------------------------------
@mcp.tool
async def get_project_features(project_id: str) -> dict:
    """List the features currently attached to a project's extraction schema.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
    """
    return await atlas_request("GET", f"/projects/{project_id}/features")


@mcp.tool
async def add_project_features(project_id: str, feature_ids: list[str]) -> dict:
    """Add features to a project's schema so they get extracted from its papers.

    Discover feature ids with `list_features`. Adding a feature does not
    re-extract existing papers — use `reprocess_project` afterwards if you want
    already-uploaded papers re-scored against the updated schema.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
        feature_ids: Ids of the features to attach to the project.
    """
    return await atlas_request(
        "POST",
        f"/projects/{project_id}/features",
        json={"feature_ids": feature_ids},
    )


@mcp.tool
async def remove_project_features(project_id: str, feature_ids: list[str]) -> dict:
    """Remove features from a project's extraction schema.

    Args:
        project_id: The id of the project (obtain it from `list_projects`).
        feature_ids: Ids of the features to detach from the project.
    """
    return await atlas_request(
        "DELETE",
        f"/projects/{project_id}/features",
        json={"feature_ids": feature_ids},
    )


# ---------------------------------------------------------------------------
# Papers: upload, processing, and progress
# ---------------------------------------------------------------------------
@mcp.tool
async def add_paper(
    project_id: str,
    file_path: Optional[str] = None,
    file_base64: Optional[str] = None,
    filename: Optional[str] = None,
    strategy_type: str = "openai_json_schema",
) -> dict:
    """Upload one of the user's PDFs into a project and start asynchronous
    feature extraction.

    This is the same upload the Atlas web app performs: the PDF is sent to Atlas
    as a multipart/form-data upload and extraction runs in the background.

    Provide the PDF in exactly one of two ways:
      * `file_path` (preferred): the path of a PDF on the user's machine, e.g.
        "~/Downloads/smith2021.pdf". Available when the Atlas MCP server runs
        locally (stdio transport). The file is read from disk and uploaded; it
        never passes through the conversation.
      * `file_base64`: the raw PDF bytes, base64-encoded. Only practical for
        very small files, since tool arguments are JSON text.

    Returns a mapping of filename to processing task id. Track progress with
    `wait_for_papers` or `get_paper_status`, then read values with
    `get_project_results`.

    Args:
        project_id: The id of the project to add the paper to.
        file_path: Path to a PDF on the user's machine (local server only).
        file_base64: The PDF file content, base64-encoded (small files only).
        filename: Name to store the PDF under (should end in .pdf). Defaults to
            the basename of `file_path`; required with `file_base64`.
        strategy_type: Extraction strategy. One of "assistant_api",
            "openai_json_schema", or "anthropic_json_schema". Defaults to
            "openai_json_schema".
    """
    if bool(file_path) == bool(file_base64):
        raise ToolError("Provide exactly one of 'file_path' or 'file_base64'.")

    if file_path:
        default_name, content = read_local_pdf(file_path)
        filename = filename or default_name
    else:
        assert file_base64 is not None
        if not filename:
            raise ToolError("'filename' is required when using 'file_base64'.")
        content = decode_pdf_base64(file_base64)

    files = [("files[]", (filename, content, "application/pdf"))]
    data = {"sid": "", "project_id": project_id, "strategy_type": strategy_type}
    return await atlas_upload("/assistant/add_paper", files=files, data=data)


@mcp.tool
async def get_paper_status(task_id: str) -> dict:
    """Check the status/result of a single paper-processing task.

    Returns the task's result once it has finished, or a status indicating it is
    still running. Obtain `task_id` values from `add_paper`.

    Args:
        task_id: The processing task id returned by `add_paper`.
    """
    result = await atlas_request(
        "GET", "/assistant/add_paper", params={"task_id": task_id}
    )
    done = result is not None
    return {"task_id": task_id, "done": done, "result": result}


@mcp.tool
async def wait_for_papers(
    task_ids: list[str],
    ctx: Context,
    poll_interval_seconds: float = 5.0,
    timeout_seconds: float = 600.0,
) -> dict:
    """Wait for paper-processing tasks to finish, reporting live progress.

    This mirrors the live status updates shown in the Atlas web app: it polls
    each task until all complete (or the timeout is reached), emitting progress
    notifications as papers finish. Use the task ids returned by `add_paper`.

    Args:
        task_ids: Processing task ids to wait on.
        poll_interval_seconds: Seconds between status checks.
        timeout_seconds: Give up waiting after this many seconds.

    Returns each task's final result plus whether everything completed in time.
    """
    if not task_ids:
        return {"completed": True, "results": {}, "pending": []}

    pending = set(task_ids)
    results: dict = {}
    total = len(task_ids)
    elapsed = 0.0

    await ctx.report_progress(progress=0, total=total)

    while pending and elapsed < timeout_seconds:
        for task_id in list(pending):
            task_result = await atlas_request(
                "GET", "/assistant/add_paper", params={"task_id": task_id}
            )
            if task_result is not None:
                results[task_id] = task_result
                pending.discard(task_id)

        done_count = total - len(pending)
        await ctx.report_progress(progress=done_count, total=total)

        if not pending:
            break

        await asyncio.sleep(poll_interval_seconds)
        elapsed += poll_interval_seconds

    return {
        "completed": not pending,
        "results": results,
        "pending": list(pending),
    }


@mcp.tool
async def reprocess_paper(
    paper_id: str, project_id: str, strategy_type: str = "json_schema"
) -> dict:
    """Re-run feature extraction for a single existing paper in a project.

    Useful after changing the project's prompt or feature schema. Returns a
    task id you can follow with `wait_for_papers` / `get_paper_status`.

    Args:
        paper_id: The id of the paper to reprocess (from `get_project_results`).
        project_id: The id of the project the paper belongs to.
        strategy_type: Extraction strategy. Defaults to "json_schema".
    """
    return await atlas_request(
        "POST",
        f"/assistant/reprocess_paper/{paper_id}",
        json={"project_id": project_id, "strategy_type": strategy_type, "sid": ""},
    )


@mcp.tool
async def reprocess_project(
    project_id: str, strategy_type: str = "json_schema"
) -> dict:
    """Re-run feature extraction for every paper in a project.

    Returns a per-paper mapping of task ids; follow them with `wait_for_papers`.

    Args:
        project_id: The id of the project whose papers should be reprocessed.
        strategy_type: Extraction strategy. Defaults to "json_schema".
    """
    return await atlas_request(
        "POST",
        f"/assistant/reprocess_project/{project_id}",
        json={"strategy_type": strategy_type, "sid": ""},
    )


def main() -> None:
    """Start the MCP server on the configured transport.

    * ``MCP_TRANSPORT=http`` (default): hosted Streamable HTTP server behind
      nginx; the caller's API key arrives in request headers.
    * ``MCP_TRANSPORT=stdio``: local install spawned by the user's MCP client;
      the API key comes from the ``ATLAS_API_KEY`` env var and local PDF
      uploads via ``file_path`` are enabled.
    """
    if config.MCP_TRANSPORT == "stdio":
        mcp.run(transport="stdio")
    else:
        mcp.run(
            transport="http",
            host=config.MCP_HOST,
            port=config.MCP_PORT,
            path=config.MCP_PATH,
            stateless_http=config.MCP_STATELESS_HTTP,
        )


if __name__ == "__main__":
    main()
