# API Reference

This document provides an overview of the RESTful API endpoints and their associated controllers in the Atlas application. API calls are secured with JWT authentication, and most endpoints require a valid token to access passed in the "Authorization" header.

---

## Authentication

### POST `/api/login`

- Description: Request a magic link / log in.
- Body (JSON):
  - `email` (string)

### POST `/api/logout`

- Description: Log out the current user.
- No body.

### POST `/api/validate`

- Description: Validate a magic-link token.
- Body (JSON):
  - `email` (string)
  - `magic_link` (string)

### GET `/api/check`

- Description: Check validity of the current JWT/token.
- No parameters.

---

## User Papers

### GET `/api/user/papers`

- Description: List the authenticated user's papers (paginated).
- Query parameters:
  - `page` (int, default 1)
  - `page_size` (int, default 10)

---

## Features

### GET `/api/features`

- Description: List all features (public + user-created).

### POST `/api/features`

- Description: Create a new feature.
- Body (JSON):
  - `feature_name` (string)
  - `feature_identifier` (string)
  - `feature_parent` (optional string)
  - `feature_description` (string)
  - plus any GPT interface fields

### DELETE `/api/features/{feature_id}`

- Description: Delete a feature by its ID.
- URL parameter:
  - `feature_id` (string)

---

## Project Features

### GET `/api/projects/{project_id}/features`

- Description: Get features attached to a project.
- URL parameter:
  - `project_id` (string)

### POST `/api/projects/{project_id}/features`

- Description: Set features for a project.
- Body (JSON):
  - `project_id` (string)
  - `feature_ids` (array of strings)

### DELETE `/api/projects/{project_id}/features`

- Description: Remove features from a project.
- Body (JSON):
  - `feature_ids` (array of strings)

---

## Paper Processing

### POST `/api/add_paper`

- Description: Upload one or more files to be processed into a project.
- Form data:
  - `files[]` (file array)
  - `sid` (socket ID string)
  - `project_id` (string)
  - `strategy_type` (string, default `assistant_api`)

### GET `/api/add_paper`

- Description: Poll status/result of a paper-addition task.
- Query:
  - `task_id` (string)

### POST `/api/reprocess_paper/{paper_id}`

- Description: Reprocess an existing paper.
- URL parameter:
  - `paper_id` (string)
- Body (JSON):
  - `project_id` (string)
  - `sid` (string)
  - `strategy_type` (string, default `assistant_api`)

### POST `/api/reprocess_project/{project_id}`

- Description: Reprocess all papers in a project.
- URL parameter:
  - `project_id` (string)
- Body (JSON):
  - `sid` (string)
  - `strategy_type` (string, default `assistant_api`)

---

## Projects

Base path: `/api/v1/projects`

### GET `/api/v1/projects`

- Description: List all projects of the authenticated user.

### POST `/api/v1/projects`

- Description: Create a new project.
- Body (JSON):
  - `project_name` (string)
  - `project_description` (string)
  - `project_features` (array of feature IDs)

### GET `/api/v1/projects/{project_id}`

- Description: Get details and results of a project.
- URL parameter:
  - `project_id` (string)

### PUT `/api/v1/projects/{project_id}`

- Description: Update a project's metadata.
- Body (JSON):
  - `project_name` (string)
  - `project_description` (string)
  - `project_prompt` (string)

### DELETE `/api/v1/projects/{project_id}`

- Description: Delete a project.

### GET `/api/v1/projects/{project_id}/results`

- Description: List results for a project.
- Query:
  - `include_versions` (true/false)

### DELETE `/api/v1/projects/{project_id}/results`

- Description: Delete specific results from a project.
- Body (JSON):
  - `result_ids` (array of strings)

### POST `/api/v1/projects/{project_id}/score_csv`

- Description: Score a CSV file against the project.
- Form data:
  - `file` (CSV file)

---

## Papers

Base path: `/api/v1/papers` (mounted under `/api/v1`)

### POST `/api/v1/papers/update/{paper_id}`

- Name: `update_paper_results`
- Description: Reprocess a paper when features change.
- URL parameter:
  - `paper_id` (string)
- Body (JSON):
  - `project_id` (string)
  - `sid` (string)
  - `strategy_type` (string, default `assistant_api`)

### POST `/api/v1/papers/batch-update`

- Name: `batch_update_papers`
- Description: Reprocess multiple papers in a project.
- Body (JSON):
  - `project_id` (string)
  - `paper_ids` (optional array of strings; all papers if omitted)
  - `strategy_type` (string, default `assistant_api`)

---

© 2023 - 2025 Atlas API – All rights reserved.
