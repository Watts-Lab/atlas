---
title: Get Started
description: Create your first Atlas project, add features, upload papers, and inspect extracted results.
---

# Get Started

This guide walks through the first successful Atlas workflow.

## 1. Sign In

Atlas uses magic-link login. Enter your email address, open the link, and return to the application.

If your team uses API keys or MCP access, create an API key from **Settings → API Keys** after signing in.

## 2. Create a Project

Open the dashboard and create a project for one review question or evidence map.

Use a project name that captures the research scope, for example:

- `LLM evaluation studies`
- `Online labor market experiments`
- `Clinical trial inclusion review`

The project prompt should describe how Atlas should read papers in this workspace. Keep it short, explicit, and domain-specific.

## 3. Define Features

Features describe what Atlas should extract from every paper. Start small.

Good first features:

| Feature            | Type      | Why it helps                       |
| ------------------ | --------- | ---------------------------------- |
| Study population   | `text`    | Captures who or what was studied.  |
| Sample size        | `number`  | Supports filtering and comparison. |
| Study design       | `enum`    | Normalizes common categories.      |
| Included in review | `boolean` | Enables screening workflows.       |

Avoid creating too many features before you have seen a few extraction results. A small schema is easier to debug.

## 4. Upload Papers

Add PDFs to the project. Atlas processes papers asynchronously, so larger documents and batches may take time.

When processing finishes, results appear in the project table.

## 5. Review Results

Inspect extracted values before exporting. The first pass is where you learn whether feature prompts are specific enough.

If a result is systematically wrong:

- tighten the feature prompt
- change the feature type
- split a broad feature into smaller features
- reprocess the paper or project

## 6. Export or Integrate

Use the web app for review and export workflows. Use the [API Reference](../reference/api.md) or [MCP integration](../integrations/mcp.md) when you want scripts or LLM clients to work with Atlas.
