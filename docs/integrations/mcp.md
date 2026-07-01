---
title: MCP Integration
description: Connect LLM clients to Atlas through the Model Context Protocol server.
---

# MCP Integration

Atlas includes an MCP server that exposes a subset of the Atlas REST API as tools for LLM clients. Each tool forwards to the Atlas REST API; the MCP server contains no separate business logic.

There are two ways to run the server:

- **Hosted (HTTP transport)** — the server runs behind nginx and clients connect over HTTP. No installation is required. Uploading a PDF requires the client to run a shell command, because the hosted server cannot read files from the user's machine.
- **Local (stdio transport)** — the client launches the server on the user's own machine. This adds a tool that uploads a PDF by its local file path, without a shell command. It requires [uv](https://docs.astral.sh/uv/).

Both modes use the same Atlas API key and the same set of non-upload tools. They differ only in how a PDF is uploaded (see [Uploading PDFs](#uploading-pdfs)).

## Authentication

Every MCP tool call acts on behalf of one Atlas user. The MCP server forwards the user's Atlas API key to the Atlas REST API.

Create API keys in the Atlas web app under **Settings → API Keys**. The raw key is shown once, at creation time.

If a tool returns `401`, the key is missing, invalid, inactive, or revoked.

## Hosted Connection

The hosted server is served at:

```txt
/mcp
```

In production, that is:

```txt
https://atlas.seas.upenn.edu/mcp
```

Configure your MCP client to send the API key in one of these headers:

```txt
Authorization: Bearer <atlas_api_key>
```

or:

```txt
X-API-Key: <atlas_api_key>
```

A typical client configuration:

```json
{
  "atlas": {
    "url": "https://atlas.seas.upenn.edu/mcp",
    "headers": {
      "Authorization": "Bearer <atlas_api_key>"
    }
  }
}
```

The **Settings → API Keys** page generates this configuration for you when you create a key.

## Local Connection

The local server runs on the user's machine over the stdio transport. The client launches it with `uvx`, which installs and runs the package on demand.

```json
{
  "atlas": {
    "command": "uvx",
    "args": ["--from", "git+https://github.com/Watts-Lab/atlas.git", "atlas-mcp"],
    "env": {
      "MCP_TRANSPORT": "stdio",
      "ATLAS_API_KEY": "<atlas_api_key>",
      "ATLAS_API_URL": "https://atlas.seas.upenn.edu/api/v1"
    }
  }
}
```

In this mode the API key comes from the `ATLAS_API_KEY` environment variable rather than an HTTP header. The **Settings → API Keys** page also generates this configuration.

## Workflow

The MCP server is built around this flow:

1. List or create a project.
2. Browse or create features.
3. Attach features to a project.
4. Upload a paper (see [Uploading PDFs](#uploading-pdfs)).
5. Wait for extraction tasks.
6. Read project results.
7. Reprocess papers or projects after changing prompts or feature schemas.

## Uploading PDFs

The tool used to upload a PDF depends on the transport. The server registers only the tool that works in the current mode, so a client sees one upload path at a time.

### Local (stdio) transport

The server runs on the user's machine and reads the file from disk, so a single tool handles the upload:

- `add_paper` takes a `project_id` and the PDF's local `file_path`, reads the file, and starts extraction. To add several papers, call it once per file.

### Hosted (HTTP) transport

The hosted server cannot read the user's disk. MCP tool arguments are JSON, so the file bytes cannot travel through a tool call. Uploading is therefore a three-step flow:

1. Call `create_paper_upload` to receive a presigned upload URL, a set of form fields, and an upload token.
2. Upload the local PDF directly to the presigned URL with a multipart form POST. Send each returned form field, then the file as the `file` field:

```bash
curl -X POST "<upload_url>" \
  -F key=<upload_fields.key> \
  -F "Content-Type=application/pdf" \
  -F policy=<upload_fields.policy> \
  -F "file=@paper.pdf"
```

3. Call `finalize_paper_upload` with the upload token to start extraction.

In both transports the file moves directly from the user's machine to storage, not through the LLM or the MCP server.

## Upload Limits

Uploaded files must be PDFs and are size-limited (50 MB by default).

- In hosted mode, the presigned upload enforces the size limit at upload time, and `finalize_paper_upload` verifies the stored object's size and confirms it is a PDF before starting extraction. Files that fail either check are rejected and removed.
- In local mode, the server checks the file's size and PDF header before uploading.

## Tooling Notes

MCP clients differ in how they configure transports, headers, and launch commands. For the hosted connection, the requirement is that every request to `/mcp` carries the Atlas API key in one of the supported headers. For the local connection, the requirement is that the client can run `uvx` and that `ATLAS_API_KEY` is set in the launch environment.
