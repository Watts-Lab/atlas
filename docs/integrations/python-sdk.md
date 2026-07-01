---
title: Python SDK
description: Use the wattslab-atlas Python package to work with Atlas projects, papers, features, and results.
---

# Python SDK

The `wattslab-atlas` package is a synchronous Python client for Atlas. It is useful for notebooks, scripts, and small automation jobs that need to create projects, manage feature schemas, upload papers, poll processing tasks, and read extracted results.

Install it from PyPI:

```bash
pip install wattslab-atlas
```

## When to Use It

Use the SDK when you want to:

- run Atlas workflows from a Python notebook
- create or inspect projects programmatically
- list, create, attach, or remove extraction features
- upload PDFs into a project
- poll background processing tasks
- reprocess papers or whole projects after changing a schema
- fetch project results for analysis

For production services that do not need the SDK convenience models, the REST API also accepts Atlas API keys through the `X-API-Key` header.

## Authentication

API-key authentication is the recommended SDK path. Create an API key in Atlas, then pass it directly to the client:

```python
from wattslab_atlas import AtlasClient

client = AtlasClient(api_key="atlas_...")
```

You can also set `ATLAS_API_KEY` in the environment and instantiate the client without arguments:

```bash
export ATLAS_API_KEY="atlas_..."
```

```python
from wattslab_atlas import AtlasClient

client = AtlasClient()
```

The older magic-link flow is still available for compatibility, but new SDK usage should prefer API keys.

## Basic Workflow

```python
from wattslab_atlas import AtlasClient
from wattslab_atlas.models import FeatureCreate

client = AtlasClient(api_key="atlas_...")

project_id = client.create_project(
    "Housing policy evidence map",
    description="Papers about housing policy interventions and outcomes.",
)

feature = client.create_feature(
    FeatureCreate(
        feature_name="Study population",
        feature_description="The population, geography, and unit of analysis studied in the paper.",
        feature_identifier="study_population",
        feature_type="string",
    )
)

client.update_project_features(project_id, [feature.id])

upload = client.upload_paper(project_id, "paper.pdf")
task_id = upload["paper.pdf"]

status = client.check_task_status(task_id)
results = client.get_project_results(project_id)
```

## Working with Projects

Projects are the main workspace boundary in Atlas. The SDK exposes both dictionary-style calls and a `Project` model with convenience methods.

```python
projects = client.list_projects()

project = client.get_project_by_id(project_id)
features = project.get_features()
results = project.get_results()
```

Use one project for one review question, evidence map, or extraction schema. If two analyses need different feature definitions or prompts, they should usually be separate projects.

## Working with Features

Features define the structured fields Atlas extracts from papers. They should be specific enough for a model to answer consistently.

```python
features = client.list_features()

client.update_project_features(
    project_id,
    feature_ids=[feature.id for feature in features],
)
```

Atlas supports feature types such as strings, numbers, booleans, and enums. Enum features are useful when the output should be normalized to a small set of known values.

## Uploading and Reprocessing Papers

PDF uploads start an asynchronous processing task. Store the returned task ID so you can poll for completion.

```python
upload = client.upload_paper(project_id, "paper.pdf")
task_id = next(iter(upload.values()))

status = client.check_task_status(task_id)
```

After changing feature prompts or project settings, reprocess existing material:

```python
client.reprocess_paper(paper_id, project_id)
client.reprocess_project(project_id)
```

## Compatibility Note

Atlas versioned REST endpoints live under `/api/v1`. The current server routes include paths such as:

```txt
/api/v1/auth/login
/api/v1/features
/api/v1/projects
/api/v1/assistant/add_paper
```

SDK versions aligned with the current API use `https://atlas.seas.upenn.edu/api/v1` as the default API base URL and keep endpoint paths relative to that versioned base.
