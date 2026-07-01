---
title: API Reference
description: REST API reference for Atlas projects, papers, features, results, authentication, and background tasks.
---

# Atlas API Reference

Complete reference for all REST API endpoints exposed by the Atlas server.

::: warning Generated reference target
This page is currently checked in as Markdown. The intended long-term source is the server OpenAPI schema exposed by Atlas, with this page regenerated during the docs build.
:::

---

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Responses](#error-responses)
- [Real-time Progress (WebSocket)](#real-time-progress-websocket)
- [Async Tasks](#async-tasks)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Authentication](#authentication-endpoints)
  - [Users](#users)
  - [Projects](#projects)
  - [Features](#features)
  - [Inclusion Criteria](#inclusion-criteria)
  - [Papers](#papers)
  - [Assistant](#assistant)
  - [Results](#results)

---

## Overview

Atlas is a systematic literature review assistant that uses large language models to extract
structured features from academic papers. This API provides full programmatic access to
projects, papers, features, and extraction results.

Interactive documentation (Swagger UI) is available at `/api/docs` when the server is running.

---

## Base URL

All versioned endpoints are prefixed with:

```
/api/v1
```

For example, the login endpoint is reachable at `POST /api/v1/auth/login`.

The health check lives outside the versioned prefix at `GET /health`.

---

## Authentication

Most endpoints require authentication. Two mechanisms are supported and can be used
interchangeably.

### 1. JWT Cookie (`cookieAuth`)

The primary authentication method for browser clients.

1. Call `POST /api/v1/auth/login` with your email — Atlas sends a magic link to that address.
2. Click the magic link, which calls `POST /api/v1/auth/validate` with the token from the link.
3. On success, the server sets an HTTP-only cookie named **`jwt`** on the response.
4. The browser sends this cookie automatically on every subsequent same-origin request.

The `jwt` cookie is HTTP-only and cannot be read by JavaScript, which protects it from XSS
attacks. It is scoped to the Atlas domain and is sent automatically by `fetch` or `axios` when
`credentials: 'include'` is set.

### 2. API Key Header (`apiKeyHeader`)

The preferred method for SDK integrations, scripts, and server-to-server calls.

Supply your API key in the **`X-API-Key`** request header on every call:

```
X-API-Key: your-api-key-here
```

Contact the Atlas team to obtain an API key associated with your account.

### Which routes require authentication?

Every endpoint except the following is protected and requires one of the two auth methods above:

| Endpoint                     | Auth required |
| ---------------------------- | ------------- |
| `GET /health`                | No            |
| `POST /api/v1/auth/login`    | No            |
| `POST /api/v1/auth/logout`   | No            |
| `POST /api/v1/auth/validate` | No            |
| All other endpoints          | **Yes**       |

---

## Error Responses

All error responses follow a consistent JSON shape.

### Standard error

```json
{
  "error": "Human-readable description of what went wrong."
}
```

### Authentication errors

```json
{
  "error": true,
  "message": "No authentication token provided."
}
```

### Common HTTP status codes

| Status                      | Meaning                                                   |
| --------------------------- | --------------------------------------------------------- |
| `200 OK`                    | Request succeeded.                                        |
| `201 Created`               | Resource created successfully.                            |
| `202 Accepted`              | Async task accepted and enqueued.                         |
| `400 Bad Request`           | Missing or invalid request parameter / body field.        |
| `401 Unauthorized`          | Missing, invalid, or expired authentication credential.   |
| `403 Forbidden`             | Authenticated, but not permitted to access this resource. |
| `404 Not Found`             | Requested resource does not exist.                        |
| `500 Internal Server Error` | Unexpected server-side error.                             |

---

## Real-time Progress (WebSocket)

Long-running operations (paper processing, feature extraction, repeatability evaluation) emit
real-time progress events over a **Socket.IO** connection on the `/home` namespace.

**Connection:**

```
ws://<host>/home
```

To receive events for a specific task, pass your Socket.IO session ID (`sid`) in the request
body of the triggering endpoint. The server will emit status updates to that `sid` as the task
progresses.

**Status event shape:**

```json
{
  "status": "processing",
  "message": "Extracting feature 3 of 12...",
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-...",
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c1"
}
```

---

## Async Tasks

Endpoints that enqueue background work return a **`task_id`** (Celery task ID string). Use the
corresponding polling endpoint or WebSocket events to track task completion.

**Task states:**

| State     | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `PENDING` | Task is queued but not yet started.                               |
| `STARTED` | Worker has picked up the task and is running it.                  |
| `SUCCESS` | Task completed successfully. `result` is populated.               |
| `FAILURE` | Task failed. Check server logs or the `result` field for details. |
| `RETRY`   | Task encountered a transient error and is being retried.          |

---

## Endpoints

---

### Health

#### `GET /health`

Check whether the server is running and accepting requests. No authentication required.
Use this endpoint for load-balancer health probes or uptime monitoring.

**Response `200 OK`**

```json
{
  "status": "ok"
}
```

---

### Authentication Endpoints

All auth endpoints are under the prefix `/api/v1/auth`.

---

#### `POST /api/v1/auth/login`

Request a magic link login email.

Sends a one-time magic link to the provided email address. If the `client_type` field is set to
`"sdk"`, the token is returned directly in the response body instead of being emailed — useful
for SDK/CLI flows.

**Auth required:** No

**Request body** (`application/json`)

| Field         | Type               | Required | Description                                                                              |
| ------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------- |
| `email`       | string (email)     | Yes      | The email address to send the magic link to.                                             |
| `client_type` | `"web"` \| `"sdk"` | No       | Client type. Use `"sdk"` to receive the token in the response body. Defaults to `"web"`. |

**Example request:**

```json
{
  "email": "researcher@university.edu"
}
```

**Response `200 OK`**

```json
{
  "message": "Magic link sent."
}
```

**Response `400 Bad Request`** — missing or invalid email

```json
{
  "error": "Email is required."
}
```

---

#### `POST /api/v1/auth/logout`

Log out the current user.

Clears the `jwt` HTTP-only cookie and ends the session. No request body is required.

**Auth required:** No

**Request body:** None

**Response `200 OK`**

```json
{
  "message": "Logged out."
}
```

---

#### `POST /api/v1/auth/validate`

Validate a magic link token.

Verifies the one-time token sent via the magic link email. On success, sets an HTTP-only `jwt`
cookie on the response containing a signed JWT for the authenticated session.

**Auth required:** No

**Request body** (`application/json`)

| Field        | Type           | Required | Description                                          |
| ------------ | -------------- | -------- | ---------------------------------------------------- |
| `email`      | string (email) | Yes      | The email address the magic link was sent to.        |
| `magic_link` | string         | Yes      | The one-time token received in the magic link email. |

**Example request:**

```json
{
  "email": "researcher@university.edu",
  "magic_link": "abc123def456..."
}
```

**Response `200 OK`** — Sets `jwt` HTTP-only cookie.

```json
{
  "message": "Token validated.",
  "email": "researcher@university.edu"
}
```

**Response `401 Unauthorized`** — invalid or expired token

```json
{
  "error": "Invalid or expired magic link."
}
```

---

#### `GET /api/v1/auth/check`

Check JWT validity.

Verifies whether the JWT stored in the `jwt` cookie (or supplied via `X-API-Key`) is valid and
not expired. Returns the authenticated user's information.

**Auth required:** Yes

**Request body:** None

**Response `200 OK`**

```json
{
  "valid": true,
  "email": "researcher@university.edu"
}
```

**Response `401 Unauthorized`**

```json
{
  "error": true,
  "message": "Token has expired."
}
```

---

### Users

#### `GET /api/v1/user/papers`

List the authenticated user's papers (paginated).

Returns all papers uploaded by the authenticated user, ordered by upload date (newest first).
Each entry includes paper metadata extracted during processing (title, authors, abstract, etc.).

**Auth required:** Yes

**Query parameters**

| Parameter   | Type    | Required | Default | Description                        |
| ----------- | ------- | -------- | ------- | ---------------------------------- |
| `page`      | integer | No       | `1`     | Page number to retrieve (1-based). |
| `page_size` | integer | No       | `10`    | Number of papers per page.         |

**Response `200 OK`**

```json
{
  "papers": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "title": "A Randomized Controlled Trial of...",
      "authors": ["Smith, J.", "Doe, A."],
      "abstract": "Background: ...",
      "filename": "smith2023_rct.pdf",
      "created_at": "2024-03-15T10:22:00",
      "updated_at": "2024-03-15T10:25:31"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total": 42,
  "total_pages": 5
}
```

---

### Projects

All project endpoints are under the prefix `/api/v1/projects`. **All require authentication.**

---

#### `GET /api/v1/projects/`

List all projects owned by the authenticated user.

Returns every project the user owns along with a summary of each project's associated papers
and extraction results. Also returns a `recently_viewed` list of projects the user has recently
opened (may include projects owned by other users that were shared).

**Response `200 OK`**

```json
{
  "project": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "title": "COVID-19 Treatment Reviews",
      "description": "Systematic review of pharmacological interventions.",
      "updated_at": "2024-03-15T10:22:00",
      "papers": ["64a1f2e3b4c5d6e7f8a9b0c2", "64a1f2e3b4c5d6e7f8a9b0c3"],
      "results": [
        {
          "id": "64a1f2e3b4c5d6e7f8a9b0c4",
          "finished": true,
          "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2"
        }
      ]
    }
  ],
  "recently_viewed": [
    {
      "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "viewed_at": "2024-03-15T12:00:00",
      "exists": true,
      "project": {
        "id": "64a1f2e3b4c5d6e7f8a9b0c1",
        "title": "COVID-19 Treatment Reviews",
        "description": "Systematic review of pharmacological interventions.",
        "updated_at": "2024-03-15T10:22:00",
        "is_owner": true
      }
    }
  ]
}
```

---

#### `POST /api/v1/projects/`

Create a new project.

**Request body** (`application/json`)

| Field                 | Type     | Required | Description                                                                |
| --------------------- | -------- | -------- | -------------------------------------------------------------------------- |
| `project_name`        | string   | Yes      | Display name for the new project.                                          |
| `project_description` | string   | No       | Free-text description of the project's research scope.                     |
| `project_features`    | string[] | No       | Feature IDs (MongoDB ObjectIds) to attach to the project at creation time. |

**Example request:**

```json
{
  "project_name": "COVID-19 Treatment Reviews",
  "project_description": "Systematic review of pharmacological interventions for COVID-19.",
  "project_features": ["64a1f2e3b4c5d6e7f8a9b0c5", "64a1f2e3b4c5d6e7f8a9b0c6"]
}
```

**Response `200 OK`**

```json
{
  "message": "Project created.",
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1"
}
```

**Response `400 Bad Request`**

```json
{
  "error": "Project name is required."
}
```

---

#### `GET /api/v1/projects/<project_id>`

Get full details of a single project.

Retrieves the project's metadata, papers, attached features, and extraction results. This call
also records the view in the authenticated user's recently-viewed history asynchronously.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Response `200 OK`**

```json
{
  "project": {
    "id": "64a1f2e3b4c5d6e7f8a9b0c1",
    "title": "COVID-19 Treatment Reviews",
    "description": "Systematic review of pharmacological interventions.",
    "updated_at": "2024-03-15T10:22:00",
    "papers": ["64a1f2e3b4c5d6e7f8a9b0c2"],
    "features": ["64a1f2e3b4c5d6e7f8a9b0c5"]
  },
  "results": [
    {
      "_result_id": "64a1f2e3b4c5d6e7f8a9b0c4",
      "_paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
      "_version": 1,
      "_is_latest": true,
      "created_at": "2024-03-15 10:25:31",
      "study_design": "RCT",
      "sample_size": 240
    }
  ]
}
```

**Response `404 Not Found`**

```json
{
  "error": "Project not found."
}
```

---

#### `PUT /api/v1/projects/<project_id>`

Update a project's metadata.

All body fields are optional — supply only those you wish to change.

**Path parameters**

| Parameter    | Type   | Description                                |
| ------------ | ------ | ------------------------------------------ |
| `project_id` | string | MongoDB ObjectId of the project to update. |

**Request body** (`application/json`)

| Field                 | Type   | Required | Description                                                        |
| --------------------- | ------ | -------- | ------------------------------------------------------------------ |
| `project_name`        | string | No       | New display name.                                                  |
| `project_description` | string | No       | New free-text description.                                         |
| `project_prompt`      | string | No       | Custom LLM extraction prompt applied to all papers in the project. |

**Example request:**

```json
{
  "project_name": "COVID-19 Reviews (Updated)",
  "project_prompt": "Focus on reporting the primary endpoint, sample size, and RCT status."
}
```

**Response `200 OK`**

```json
{
  "message": "Project updated.",
  "project": {
    "id": "64a1f2e3b4c5d6e7f8a9b0c1",
    "title": "COVID-19 Reviews (Updated)"
  }
}
```

**Response `404 Not Found`**

```json
{
  "error": "Project not found."
}
```

---

#### `DELETE /api/v1/projects/<project_id>`

Delete a project.

Permanently deletes the project and all associated data. Only the project owner may delete it.

**Path parameters**

| Parameter    | Type   | Description                                |
| ------------ | ------ | ------------------------------------------ |
| `project_id` | string | MongoDB ObjectId of the project to delete. |

**Response `200 OK`**

```json
{
  "message": "Project deleted."
}
```

**Response `404 Not Found`**

```json
{
  "error": "Project not found."
}
```

---

#### `GET /api/v1/projects/<project_id>/results`

List extraction results for a project.

By default, only the **latest** result per paper is returned. Set `include_versions=true` to
include all historical versions, ordered by paper then creation time (newest first). Each result
row contains all extracted feature values plus Atlas metadata fields prefixed with `_`.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Query parameters**

| Parameter          | Type    | Required | Default | Description                                                                             |
| ------------------ | ------- | -------- | ------- | --------------------------------------------------------------------------------------- |
| `include_versions` | boolean | No       | `false` | Set to `true` to include all historical result versions, not just the latest per paper. |

**Response `200 OK`**

```json
{
  "message": "results found.",
  "results": [
    {
      "_result_id": "64a1f2e3b4c5d6e7f8a9b0c4",
      "_paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
      "_version": 2,
      "_is_latest": true,
      "created_at": "2024-03-15 10:25:31",
      "study_design": "RCT",
      "sample_size": 240,
      "has_control_group": true
    }
  ],
  "ids": ["64a1f2e3b4c5d6e7f8a9b0c4"]
}
```

> **Note:** Result rows are open-ended — the keys beyond the `_` prefixed metadata fields
> correspond to the `feature_identifier` values of whichever features are attached to the
> project.

---

#### `DELETE /api/v1/projects/<project_id>/results`

Delete specific results from a project.

Permanently deletes the specified result documents. If a deleted result was marked as the
latest version, the previous version (if any) is automatically promoted to latest. Only the
project owner may delete results.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Request body** (`application/json`)

| Field        | Type     | Required | Description                                             |
| ------------ | -------- | -------- | ------------------------------------------------------- |
| `result_ids` | string[] | Yes      | List of result MongoDB ObjectIds to permanently delete. |

**Example request:**

```json
{
  "result_ids": ["64a1f2e3b4c5d6e7f8a9b0c4", "64a1f2e3b4c5d6e7f8a9b0c8"]
}
```

**Response `200 OK`**

```json
{
  "message": "Results deleted."
}
```

**Response `400 Bad Request`** — no IDs provided

```json
{
  "error": "No result IDs provided."
}
```

**Response `403 Forbidden`** — not the project owner

```json
{
  "error": "You do not have permission to delete these results."
}
```

---

#### `POST /api/v1/projects/<project_id>/score_csv`

Score a CSV file against a project's features.

Accepts a multipart CSV file upload and enqueues a background Celery task that scores each row
against the project's feature set. Returns a `task_id` that can be polled with the GET variant
of this endpoint.

**Path parameters**

| Parameter    | Type   | Description                                       |
| ------------ | ------ | ------------------------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project to score against. |

**Request body** (`multipart/form-data`)

| Field  | Type       | Required | Description                                                          |
| ------ | ---------- | -------- | -------------------------------------------------------------------- |
| `file` | file (CSV) | Yes      | CSV file where each row represents a paper or entry to be evaluated. |

**Response `200 OK`**

```json
{
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "message": "CSV scoring task started",
  "file_name": "papers_to_score.csv",
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1"
}
```

**Response `400 Bad Request`** — no file provided

```json
{
  "error": "No CSV file provided."
}
```

---

#### `GET /api/v1/projects/<project_id>/score_csv`

Poll the status of a CSV scoring task.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Query parameters**

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `task_id` | string | Yes      | Celery task ID returned by the POST request. |

**Response `200 OK`**

```json
{
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "status": "SUCCESS",
  "result": {
    "scored_rows": 45,
    "output_path": "..."
  }
}
```

`result` is `null` while the task is still running (`PENDING` / `STARTED`).

---

#### `GET /api/v1/projects/<project_id>/ground_truth`

Get ground truth feature scores for a project.

Returns the aggregated feature-quality (ground truth) scores for every feature that has been
evaluated via the repeatability workflow in this project. Scores reflect how consistently the
LLM extracts each feature across multiple independent runs on the same paper.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Response `200 OK`**

```json
{
  "message": "Feature scores retrieved successfully",
  "feature_scores": [
    {
      "feature_id": "64a1f2e3b4c5d6e7f8a9b0c5",
      "feature_identifier": "study_design",
      "feature_score": 0.94,
      "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "paper_ids": ["64a1f2e3b4c5d6e7f8a9b0c2"],
      "results_ids": ["64a1f2e3b4c5d6e7f8a9b0c9"],
      "created_at": "2024-03-14 09:00:00",
      "updated_at": "2024-03-15 11:30:00"
    }
  ]
}
```

---

#### `GET /api/v1/projects/<project_id>/features`

Get features attached to a project.

Returns the full details of every feature currently attached to the project, including all LLM
extraction configuration fields.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Response `200 OK`**

```json
{
  "features": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0c5",
      "feature_name": "Study Design",
      "feature_identifier": "study_design",
      "feature_description": "The type of study design used (e.g. RCT, cohort, case-control).",
      "gpt_type": "categorical",
      "gpt_options": ["RCT", "cohort", "case-control", "cross-sectional", "other"]
    }
  ]
}
```

---

#### `POST /api/v1/projects/<project_id>/features`

Attach features to a project.

Associates one or more existing features with the project. Features must already exist; use
`POST /api/v1/features/` to create new features first.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Request body** (`application/json`)

| Field         | Type     | Required | Description                                                 |
| ------------- | -------- | -------- | ----------------------------------------------------------- |
| `feature_ids` | string[] | Yes      | List of feature MongoDB ObjectIds to attach to the project. |

**Example request:**

```json
{
  "feature_ids": ["64a1f2e3b4c5d6e7f8a9b0c5", "64a1f2e3b4c5d6e7f8a9b0c6"]
}
```

**Response `200 OK`** — returns the updated list of all features attached to the project

```json
{
  "features": [...]
}
```

---

#### `DELETE /api/v1/projects/<project_id>/features`

Detach features from a project.

Removes the association between the specified features and the project. The features themselves
are **not** deleted — only the link between them and this project is removed.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Request body** (`application/json`)

| Field         | Type     | Required | Description                                                   |
| ------------- | -------- | -------- | ------------------------------------------------------------- |
| `feature_ids` | string[] | Yes      | List of feature MongoDB ObjectIds to detach from the project. |

**Example request:**

```json
{
  "feature_ids": ["64a1f2e3b4c5d6e7f8a9b0c6"]
}
```

**Response `200 OK`** — returns the updated list of remaining features

```json
{
  "features": [...]
}
```

---

### Features

All feature endpoints are under the prefix `/api/v1/features`. **All require authentication.**

---

#### `GET /api/v1/features/`

List features visible to the authenticated user.

Returns all global (system-defined) features plus features created by the authenticated user.
Optionally filter to only features attached to a specific project using the `project_id` query
parameter.

**Query parameters**

| Parameter    | Type   | Required | Description                                                  |
| ------------ | ------ | -------- | ------------------------------------------------------------ |
| `project_id` | string | No       | If provided, returns only features attached to this project. |

**Response `200 OK`**

```json
{
  "features": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0c5",
      "feature_name": "Study Design",
      "feature_identifier": "study_design",
      "feature_parent": null,
      "feature_description": "The type of study design used.",
      "gpt_prompt": "What is the study design of this paper?",
      "gpt_type": "categorical",
      "gpt_options": ["RCT", "cohort", "case-control", "cross-sectional", "other"]
    }
  ]
}
```

---

#### `POST /api/v1/features/`

Create a new custom feature.

The `feature_identifier` must be unique within the user's feature set and is used as the column
header in extraction result tables. Choose a short, descriptive, snake_case key.

**Request body** (`application/json`)

| Field                 | Type     | Required | Description                                                                                          |
| --------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `feature_name`        | string   | Yes      | Human-readable display name (e.g. `"Sample Size"`).                                                  |
| `feature_identifier`  | string   | Yes      | Short snake_case key used as a result column header (e.g. `"sample_size"`). Must be unique per user. |
| `feature_description` | string   | Yes      | Detailed description of what this feature captures from a paper.                                     |
| `feature_parent`      | string   | No       | MongoDB ObjectId of a parent feature for hierarchical grouping.                                      |
| `gpt_prompt`          | string   | No       | Prompt text forwarded to the LLM during extraction.                                                  |
| `gpt_type`            | string   | No       | Output type hint for the LLM. One of `"boolean"`, `"string"`, `"number"`, `"categorical"`.           |
| `gpt_options`         | string[] | No       | Enumerated answer choices when `gpt_type` is `"categorical"`.                                        |

**Example request:**

```json
{
  "feature_name": "Sample Size",
  "feature_identifier": "sample_size",
  "feature_description": "Total number of participants enrolled in the study.",
  "gpt_prompt": "What is the total sample size (number of participants) reported in this study?",
  "gpt_type": "number"
}
```

**Response `201 Created`**

```json
{
  "message": "Feature created.",
  "feature": {
    "id": "64a1f2e3b4c5d6e7f8a9b0c5",
    "feature_name": "Sample Size",
    "feature_identifier": "sample_size",
    "feature_description": "Total number of participants enrolled in the study.",
    "gpt_prompt": "What is the total sample size (number of participants) reported in this study?",
    "gpt_type": "number",
    "gpt_options": null,
    "feature_parent": null
  }
}
```

---

#### `PUT /api/v1/features/<feature_id>`

Update an existing feature.

All fields are optional — supply only those you wish to change. Only the feature owner may
update it.

**Path parameters**

| Parameter    | Type   | Description                                |
| ------------ | ------ | ------------------------------------------ |
| `feature_id` | string | MongoDB ObjectId of the feature to update. |

**Request body** (`application/json`) — all fields optional

| Field                 | Type             | Description                                          |
| --------------------- | ---------------- | ---------------------------------------------------- |
| `feature_name`        | string           | Updated human-readable display name.                 |
| `feature_identifier`  | string           | Updated snake_case key. Must remain unique per user. |
| `feature_description` | string           | Updated description.                                 |
| `feature_parent`      | string \| null   | Updated parent feature ID.                           |
| `gpt_prompt`          | string \| null   | Updated LLM extraction prompt.                       |
| `gpt_type`            | string \| null   | Updated output type hint.                            |
| `gpt_options`         | string[] \| null | Updated enumerated answer choices.                   |

**Response `200 OK`**

```json
{
  "message": "Feature updated.",
  "feature": {
    "id": "64a1f2e3b4c5d6e7f8a9b0c5",
    "feature_name": "Sample Size (N)",
    "feature_identifier": "sample_size"
  }
}
```

**Response `403 Forbidden`** — not the feature owner
**Response `404 Not Found`** — feature not found

---

#### `DELETE /api/v1/features/<feature_id>`

Delete a feature.

Permanently removes the feature. Only the feature owner may delete it. Deleting a feature does
**not** automatically remove extraction results that were already generated using it.

**Path parameters**

| Parameter    | Type   | Description                                |
| ------------ | ------ | ------------------------------------------ |
| `feature_id` | string | MongoDB ObjectId of the feature to delete. |

**Response `200 OK`**

```json
{
  "message": "Feature deleted."
}
```

**Response `403 Forbidden`** — not the feature owner
**Response `404 Not Found`** — feature not found

---

### Inclusion Criteria

Inclusion criteria are boolean rules evaluated against a paper's extracted feature values to
automatically classify papers as included or excluded from a systematic review. All endpoints
are mounted under `/api/v1/projects/<project_id>/inclusion-criteria` and **require authentication**.

---

#### `GET /api/v1/projects/<project_id>/inclusion-criteria`

List all inclusion criteria for a project.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Response `200 OK`**

```json
{
  "criteria": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0ca",
      "name": "Is RCT with control group",
      "description": "Paper must be a randomized controlled trial with an explicit control arm.",
      "formula": "study_design == 'RCT' AND has_control_group == true",
      "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "created_at": "2024-03-14T09:00:00",
      "updated_at": "2024-03-14T09:00:00"
    }
  ]
}
```

---

#### `POST /api/v1/projects/<project_id>/inclusion-criteria`

Create a new inclusion criterion for a project.

The `formula` field is a boolean expression that references feature identifiers as variables and
is evaluated against each paper's extraction results.

**Path parameters**

| Parameter    | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project. |

**Request body** (`application/json`)

| Field         | Type   | Required | Description                                                                                                                                                     |
| ------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string | Yes      | Short display name for the criterion (e.g. `"Has control group"`).                                                                                              |
| `description` | string | No       | Free-text explanation of the criterion's intent. Defaults to `""`.                                                                                              |
| `formula`     | any    | Yes      | Boolean formula evaluated against extracted feature values. References feature identifiers as variables (e.g. `"study_design == 'RCT' AND sample_size > 100"`). |

**Example request:**

```json
{
  "name": "Large RCT",
  "description": "Randomized controlled trials with at least 100 participants.",
  "formula": "study_design == 'RCT' AND sample_size >= 100"
}
```

**Response `201 Created`**

```json
{
  "criteria": {
    "id": "64a1f2e3b4c5d6e7f8a9b0ca",
    "name": "Large RCT",
    "description": "Randomized controlled trials with at least 100 participants.",
    "formula": "study_design == 'RCT' AND sample_size >= 100",
    "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
    "created_at": "2024-03-15T10:22:00",
    "updated_at": "2024-03-15T10:22:00"
  }
}
```

---

#### `PUT /api/v1/projects/<project_id>/inclusion-criteria/<criteria_id>`

Update an existing inclusion criterion.

All body fields are optional — supply only those you wish to change.

**Path parameters**

| Parameter     | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `project_id`  | string | MongoDB ObjectId of the owning project.      |
| `criteria_id` | string | MongoDB ObjectId of the criterion to update. |

**Request body** (`application/json`) — all fields optional

| Field         | Type   | Description              |
| ------------- | ------ | ------------------------ |
| `name`        | string | Updated display name.    |
| `description` | string | Updated description.     |
| `formula`     | any    | Updated boolean formula. |

**Response `200 OK`**

```json
{
  "criteria": {
    "id": "64a1f2e3b4c5d6e7f8a9b0ca",
    "name": "Large RCT (updated)"
  }
}
```

**Response `404 Not Found`** — criterion not found

---

#### `DELETE /api/v1/projects/<project_id>/inclusion-criteria/<criteria_id>`

Delete an inclusion criterion.

Permanently removes the criterion. Existing paper classifications computed using this criterion
are **not** retroactively affected.

**Path parameters**

| Parameter     | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `project_id`  | string | MongoDB ObjectId of the owning project.      |
| `criteria_id` | string | MongoDB ObjectId of the criterion to delete. |

**Response `200 OK`**

```json
{
  "message": "Criteria deleted."
}
```

**Response `404 Not Found`** — criterion not found

---

### Papers

All paper endpoints are under the prefix `/api/v1/papers`. **All require authentication.**

---

#### `POST /api/v1/papers/update/<paper_id>`

Reprocess a single paper.

Triggers background reprocessing of an already-stored paper against the current feature set of
the specified project. Useful after features have been added, removed, or modified on a project
to refresh the extraction results for one paper without re-uploading it.

The authenticated user must own **both** the paper and the project.

**Path parameters**

| Parameter  | Type   | Description                                 |
| ---------- | ------ | ------------------------------------------- |
| `paper_id` | string | MongoDB ObjectId of the paper to reprocess. |

**Request body** (`application/json`)

| Field           | Type                                     | Required | Description                                                                            |
| --------------- | ---------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| `project_id`    | string                                   | Yes      | MongoDB ObjectId of the project whose features should be used.                         |
| `sid`           | string                                   | No       | Socket.IO session ID for real-time progress events. Defaults to `"update_<paper_id>"`. |
| `strategy_type` | `"assistant_api"` \| `"chat_completion"` | No       | LLM extraction strategy. Defaults to `"assistant_api"`.                                |

**Example request:**

```json
{
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "sid": "abc123socketid",
  "strategy_type": "assistant_api"
}
```

**Response `200 OK`**

```json
{
  "message": "Reprocessing started",
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2"
}
```

**Response `400 Bad Request`** — `project_id` missing
**Response `403 Forbidden`** — user does not own the paper or project
**Response `404 Not Found`** — paper or project not found

---

#### `POST /api/v1/papers/batch-update`

Reprocess multiple papers in a project.

Enqueues background reprocessing tasks for multiple papers simultaneously. If `paper_ids` is
omitted or empty, **all papers in the project** are reprocessed. Each paper is queued as an
independent Celery task. Papers not owned by the authenticated user within the provided list
are skipped with an `"error"` status entry.

The authenticated user must own the project.

**Request body** (`application/json`)

| Field           | Type                                     | Required | Description                                                                             |
| --------------- | ---------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `project_id`    | string                                   | Yes      | MongoDB ObjectId of the project.                                                        |
| `paper_ids`     | string[]                                 | No       | Paper ObjectIds to reprocess. Omit or pass `[]` to reprocess all papers in the project. |
| `strategy_type` | `"assistant_api"` \| `"chat_completion"` | No       | LLM extraction strategy for all papers. Defaults to `"assistant_api"`.                  |

**Example request:**

```json
{
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "paper_ids": ["64a1f2e3b4c5d6e7f8a9b0c2", "64a1f2e3b4c5d6e7f8a9b0c3"]
}
```

**Response `200 OK`**

```json
{
  "message": "Batch update started",
  "tasks": {
    "64a1f2e3b4c5d6e7f8a9b0c2": {
      "status": "processing",
      "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d"
    },
    "64a1f2e3b4c5d6e7f8a9b0c3": {
      "status": "error",
      "error": "Unauthorized"
    }
  }
}
```

**Response `400 Bad Request`** — `project_id` missing
**Response `404 Not Found`** — project not found or user does not own it

---

### Assistant

The assistant routes handle uploading new papers and triggering the full LLM extraction
pipeline. All endpoints are under `/api/v1/assistant` and **require authentication**.

---

#### `POST /api/v1/assistant/add_paper`

Upload one or more papers for processing.

Accepts one or more files via multipart upload, stores each as a Paper document, and enqueues
a background Celery task that runs the full feature extraction pipeline against the specified
project's feature set. Progress events are emitted over the WebSocket `/home` namespace using
the provided `sid`.

**Request body** (`multipart/form-data`)

| Field           | Type                                     | Required | Description                                                                  |
| --------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `files[]`       | file[]                                   | Yes      | One or more paper files (PDF, TXT, etc.) to upload and process.              |
| `project_id`    | string                                   | Yes      | MongoDB ObjectId of the project to add the papers to.                        |
| `sid`           | string                                   | No       | Socket.IO session ID for real-time progress events on the `/home` namespace. |
| `strategy_type` | `"assistant_api"` \| `"chat_completion"` | No       | LLM extraction strategy. Defaults to `"assistant_api"`.                      |

**Response `200 OK`**

```json
{
  "message": "Papers queued for processing.",
  "task_ids": ["d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d", "e4a9c3f1-2d8b-4e7f-a0c1-8b7d6e5f4a3b"]
}
```

**Response `400 Bad Request`** — no files provided or missing `project_id`

---

#### `GET /api/v1/assistant/add_paper`

Poll the status of a paper-addition task.

**Query parameters**

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `task_id` | string | Yes      | Celery task ID returned by the POST request. |

**Response `200 OK`**

```json
{
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "status": "SUCCESS",
  "result": {
    "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
    "title": "A Randomized Controlled Trial of..."
  }
}
```

`result` is `null` while the task is still running.

---

#### `POST /api/v1/assistant/reprocess_paper/<paper_id>`

Reprocess an existing paper through the assistant pipeline.

Re-runs the full LLM extraction workflow for an already-stored paper against the current
feature set of the specified project, creating a new **versioned** result document. Previous
results for this paper have their `_is_latest` flag set to `false`.

Useful when:

- The project's features have changed since the paper was originally processed.
- You want to experiment with a different `strategy_type`.
- A previous extraction produced incorrect or incomplete results.

**Path parameters**

| Parameter  | Type   | Description                                 |
| ---------- | ------ | ------------------------------------------- |
| `paper_id` | string | MongoDB ObjectId of the paper to reprocess. |

**Request body** (`application/json`)

| Field           | Type                                     | Required | Description                                                    |
| --------------- | ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `project_id`    | string                                   | Yes      | MongoDB ObjectId of the project whose features should be used. |
| `strategy_type` | `"assistant_api"` \| `"chat_completion"` | No       | LLM extraction strategy. Defaults to `"assistant_api"`.        |
| `sid`           | string                                   | No       | Socket.IO session ID for real-time progress events.            |

**Example request:**

```json
{
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "strategy_type": "chat_completion",
  "sid": "abc123socketid"
}
```

**Response `200 OK`**

```json
{
  "message": "Reprocessing started.",
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2"
}
```

**Response `400 Bad Request`** — missing `project_id`
**Response `404 Not Found`** — paper or project not found

---

#### `POST /api/v1/assistant/reprocess_project/<project_id>`

Reprocess all papers in a project.

Enqueues background reprocessing tasks for **every paper** in the specified project. Each paper
is processed as an independent Celery task. When `sid` is provided, per-paper progress events
are emitted over the WebSocket `/home` namespace.

**Path parameters**

| Parameter    | Type   | Description                                                         |
| ------------ | ------ | ------------------------------------------------------------------- |
| `project_id` | string | MongoDB ObjectId of the project whose papers should be reprocessed. |

**Request body** (`application/json`) — all fields optional

| Field           | Type                                     | Required | Description                                                            |
| --------------- | ---------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `strategy_type` | `"assistant_api"` \| `"chat_completion"` | No       | LLM extraction strategy for all papers. Defaults to `"assistant_api"`. |
| `sid`           | string                                   | No       | Socket.IO session ID for per-paper real-time progress events.          |

**Example request:**

```json
{
  "strategy_type": "assistant_api",
  "sid": "abc123socketid"
}
```

**Response `200 OK`**

```json
{
  "message": "Project reprocessing started.",
  "tasks": {
    "64a1f2e3b4c5d6e7f8a9b0c2": {
      "status": "processing",
      "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d"
    },
    "64a1f2e3b4c5d6e7f8a9b0c3": {
      "status": "processing",
      "task_id": "e4a9c3f1-2d8b-4e7f-a0c1-8b7d6e5f4a3b"
    }
  }
}
```

**Response `400 Bad Request`** — invalid parameters
**Response `404 Not Found`** — project not found or user does not own it

---

### Results

The results routes handle feature repeatability evaluation and single-feature extraction. All
endpoints are under `/api/v1/results` and **require authentication**.

---

#### `POST /api/v1/results/features/<feature_id>/evaluate_repeatability`

Trigger repeatability evaluation for a feature.

Enqueues a background Celery task that runs feature extraction **multiple times** on the same
paper and measures how consistently the LLM returns the same answer (inter-run agreement).
The resulting score is stored as a `FeaturesQuality` document and contributes to the project's
ground truth scores (see `GET /api/v1/projects/{project_id}/ground_truth`).

**Path parameters**

| Parameter    | Type   | Description                                  |
| ------------ | ------ | -------------------------------------------- |
| `feature_id` | string | MongoDB ObjectId of the feature to evaluate. |

**Request body** (`application/json`)

| Field        | Type   | Required | Description                                                       |
| ------------ | ------ | -------- | ----------------------------------------------------------------- |
| `paper_id`   | string | Yes      | MongoDB ObjectId of the paper to run the evaluation on.           |
| `project_id` | string | Yes      | MongoDB ObjectId of the project providing the extraction context. |
| `sid`        | string | No       | Socket.IO session ID for real-time progress events.               |

**Example request:**

```json
{
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "sid": "abc123socketid"
}
```

**Response `202 Accepted`**

```json
{
  "message": "Repeatability evaluation started.",
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "result_id": "64a1f2e3b4c5d6e7f8a9b0cb"
}
```

Use `result_id` with `GET /api/v1/results/repeatability_results/<result_id>` to fetch the
completed run's details.

**Response `400 Bad Request`** — missing `paper_id` or `project_id`
**Response `404 Not Found`** — feature, paper, or project not found

---

#### `POST /api/v1/results/features/<feature_id>/extract`

Run a single feature extraction on a paper.

Runs a one-shot LLM extraction for the specified feature on an already-stored paper. Unlike
the full assistant pipeline, this targets a **single feature**, making it useful for selective
re-extraction or debugging individual features.

The new extraction is stored as a versioned `Result` document. The previous result for this
paper/feature pair (if any) has its `_is_latest` flag set to `false`.

**Path parameters**

| Parameter    | Type   | Description                                 |
| ------------ | ------ | ------------------------------------------- |
| `feature_id` | string | MongoDB ObjectId of the feature to extract. |

**Request body** (`application/json`)

| Field        | Type   | Required | Description                                                                         |
| ------------ | ------ | -------- | ----------------------------------------------------------------------------------- |
| `paper_id`   | string | Yes      | MongoDB ObjectId of the paper to run extraction on.                                 |
| `project_id` | string | Yes      | MongoDB ObjectId of the project providing the extraction context and custom prompt. |
| `sid`        | string | No       | Socket.IO session ID for real-time progress events.                                 |

**Example request:**

```json
{
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1"
}
```

**Response `202 Accepted`**

```json
{
  "message": "Feature extraction started.",
  "task_id": "d3f1a2b4-9c8e-4f2a-b1d0-7e6f5a4b3c2d",
  "result_id": "64a1f2e3b4c5d6e7f8a9b0c4"
}
```

**Response `400 Bad Request`** — missing `paper_id` or `project_id`
**Response `404 Not Found`** — feature, paper, or project not found

---

#### `GET /api/v1/results/features/<feature_id>/evaluations`

List repeatability evaluations for a feature.

Returns the full history of repeatability evaluation runs for the specified feature, ordered by
creation time (newest first). Use the `id` field from each entry with the endpoint below to
fetch the full detail of a specific run.

**Path parameters**

| Parameter    | Type   | Description                                                           |
| ------------ | ------ | --------------------------------------------------------------------- |
| `feature_id` | string | MongoDB ObjectId of the feature whose evaluation history to retrieve. |

**Response `200 OK`**

```json
{
  "evaluations": [
    {
      "id": "64a1f2e3b4c5d6e7f8a9b0cb",
      "feature_id": "64a1f2e3b4c5d6e7f8a9b0c5",
      "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
      "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
      "score": 0.94,
      "status": "completed",
      "created_at": "2024-03-14T09:00:00"
    }
  ]
}
```

**Response `404 Not Found`** — feature not found

---

#### `GET /api/v1/results/repeatability_results/<result_id>`

Get a repeatability result by ID.

Fetches the full detail of a single repeatability result document, including the individual
extraction run outputs that were compared and the computed inter-run agreement score.

**Path parameters**

| Parameter   | Type   | Description                                               |
| ----------- | ------ | --------------------------------------------------------- |
| `result_id` | string | MongoDB ObjectId of the repeatability result to retrieve. |

**Response `200 OK`**

```json
{
  "id": "64a1f2e3b4c5d6e7f8a9b0cb",
  "feature_id": "64a1f2e3b4c5d6e7f8a9b0c5",
  "feature_identifier": "study_design",
  "paper_id": "64a1f2e3b4c5d6e7f8a9b0c2",
  "project_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "runs": [
    { "run_index": 0, "value": "RCT" },
    { "run_index": 1, "value": "RCT" },
    { "run_index": 2, "value": "randomized controlled trial" }
  ],
  "agreement_score": 0.94,
  "status": "completed",
  "created_at": "2024-03-14T09:00:00",
  "updated_at": "2024-03-14T09:05:32"
}
```

**Response `404 Not Found`** — result not found

---

## Endpoint Summary

| Method   | Path                                                             | Auth | Tag                | Description                         |
| -------- | ---------------------------------------------------------------- | ---- | ------------------ | ----------------------------------- |
| `GET`    | `/health`                                                        | No   | Health             | Server health check                 |
| `POST`   | `/api/v1/auth/login`                                             | No   | Auth               | Request magic link                  |
| `POST`   | `/api/v1/auth/logout`                                            | No   | Auth               | Log out                             |
| `POST`   | `/api/v1/auth/validate`                                          | No   | Auth               | Validate magic link, set JWT cookie |
| `GET`    | `/api/v1/auth/check`                                             | Yes  | Auth               | Check JWT validity                  |
| `GET`    | `/api/v1/user/papers`                                            | Yes  | Users              | List user's papers (paginated)      |
| `GET`    | `/api/v1/projects/`                                              | Yes  | Projects           | List user's projects                |
| `POST`   | `/api/v1/projects/`                                              | Yes  | Projects           | Create project                      |
| `GET`    | `/api/v1/projects/<project_id>`                                  | Yes  | Projects           | Get project detail                  |
| `PUT`    | `/api/v1/projects/<project_id>`                                  | Yes  | Projects           | Update project                      |
| `DELETE` | `/api/v1/projects/<project_id>`                                  | Yes  | Projects           | Delete project                      |
| `GET`    | `/api/v1/projects/<project_id>/results`                          | Yes  | Projects           | List project results                |
| `DELETE` | `/api/v1/projects/<project_id>/results`                          | Yes  | Projects           | Delete specific results             |
| `POST`   | `/api/v1/projects/<project_id>/score_csv`                        | Yes  | Projects           | Upload CSV for scoring              |
| `GET`    | `/api/v1/projects/<project_id>/score_csv`                        | Yes  | Projects           | Poll CSV scoring task               |
| `GET`    | `/api/v1/projects/<project_id>/ground_truth`                     | Yes  | Projects           | Get feature ground truth scores     |
| `GET`    | `/api/v1/projects/<project_id>/features`                         | Yes  | Projects           | Get features attached to project    |
| `POST`   | `/api/v1/projects/<project_id>/features`                         | Yes  | Projects           | Attach features to project          |
| `DELETE` | `/api/v1/projects/<project_id>/features`                         | Yes  | Projects           | Detach features from project        |
| `GET`    | `/api/v1/projects/<project_id>/inclusion-criteria`               | Yes  | Inclusion Criteria | List inclusion criteria             |
| `POST`   | `/api/v1/projects/<project_id>/inclusion-criteria`               | Yes  | Inclusion Criteria | Create inclusion criterion          |
| `PUT`    | `/api/v1/projects/<project_id>/inclusion-criteria/<criteria_id>` | Yes  | Inclusion Criteria | Update criterion                    |
| `DELETE` | `/api/v1/projects/<project_id>/inclusion-criteria/<criteria_id>` | Yes  | Inclusion Criteria | Delete criterion                    |
| `GET`    | `/api/v1/features/`                                              | Yes  | Features           | List visible features               |
| `POST`   | `/api/v1/features/`                                              | Yes  | Features           | Create feature                      |
| `PUT`    | `/api/v1/features/<feature_id>`                                  | Yes  | Features           | Update feature                      |
| `DELETE` | `/api/v1/features/<feature_id>`                                  | Yes  | Features           | Delete feature                      |
| `POST`   | `/api/v1/papers/update/<paper_id>`                               | Yes  | Papers             | Reprocess single paper              |
| `POST`   | `/api/v1/papers/batch-update`                                    | Yes  | Papers             | Reprocess multiple papers           |
| `POST`   | `/api/v1/assistant/add_paper`                                    | Yes  | Assistant          | Upload papers for processing        |
| `GET`    | `/api/v1/assistant/add_paper`                                    | Yes  | Assistant          | Poll paper upload task              |
| `POST`   | `/api/v1/assistant/reprocess_paper/<paper_id>`                   | Yes  | Assistant          | Reprocess paper via assistant       |
| `POST`   | `/api/v1/assistant/reprocess_project/<project_id>`               | Yes  | Assistant          | Reprocess all papers in project     |
| `POST`   | `/api/v1/results/features/<feature_id>/evaluate_repeatability`   | Yes  | Results            | Start repeatability evaluation      |
| `POST`   | `/api/v1/results/features/<feature_id>/extract`                  | Yes  | Results            | Run single feature extraction       |
| `GET`    | `/api/v1/results/features/<feature_id>/evaluations`              | Yes  | Results            | List feature evaluations            |
| `GET`    | `/api/v1/results/repeatability_results/<result_id>`              | Yes  | Results            | Get repeatability result detail     |

---

_Atlas API — © 2025 University of Pennsylvania. All rights reserved._

```

Now let me save the file using the edit tool to write it properly:
```
