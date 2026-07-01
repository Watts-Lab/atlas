---
title: MCP Integration
description: Connect LLM clients to Atlas through the Model Context Protocol server.
---

# MCP Integration

Atlas includes an MCP server that exposes a subset of the Atlas REST API as tools for LLM clients.

The MCP server is designed to sit behind nginx at:

```txt
/mcp
```

In production, that usually means:

```txt
https://<your-atlas-domain>/mcp
```

## Authentication

Every MCP tool call acts on behalf of one Atlas user. The MCP server forwards the user’s Atlas API key to the Atlas REST API.

Configure your MCP client to send either:

```txt
Authorization: Bearer <atlas_api_key>
```

or:

```txt
X-API-Key: <atlas_api_key>
```

Create API keys in the Atlas web app under **Settings → API Keys**.

## Available Workflow

The MCP server is built around this flow:

1. List or create a project.
2. Browse or create features.
3. Attach features to a project.
4. Upload a paper using the presigned upload flow.
5. Wait for extraction tasks.
6. Read project results.
7. Reprocess papers or projects after changing prompts or feature schemas.

## Uploading PDFs

PDF bytes do not pass through the MCP conversation. Uploading a paper is a three-step flow:

1. Call `create_paper_upload` to receive a one-time upload URL and upload token.
2. Upload the local PDF directly to the upload URL:

```bash
curl -X PUT \
  -H "Content-Type: application/pdf" \
  --data-binary @paper.pdf \
  "<upload_url>"
```

3. Call `finalize_paper_upload` with the upload token.

This keeps files moving directly from the user’s machine to storage, rather than through the LLM or MCP server.

## Tooling Notes

MCP clients vary in how they configure HTTP headers. The important part is that every request to `/mcp` includes the Atlas API key in one of the supported headers.

If a tool returns `401`, the key is missing, invalid, inactive, or revoked.
