---
title: Projects
description: How Atlas projects organize papers, feature schemas, prompts, and results.
---

# Projects

A project is the main unit of work in Atlas. It represents one review workspace and owns the papers, features, prompts, and results for that review.

## When to Create a New Project

Create a separate project when the review question, paper corpus, or extraction schema changes materially.

Good project boundaries:

- one systematic review
- one evidence map
- one dataset-building effort
- one experiment around extraction prompts or schemas

Avoid using one project for unrelated research questions. The feature schema and prompt will become hard to reason about.

## Project Prompt

The project prompt tells Atlas how to read papers in this workspace. It should provide context that applies to every paper and every feature.

Good prompts are:

- short
- domain-specific
- written as instructions
- stable across the project

Feature-specific details belong in feature prompts, not the project prompt.

## Reprocessing

Reprocess papers when you change:

- the project prompt
- the selected feature set
- feature definitions
- extraction strategy

Reprocessing creates new extracted results. Use it deliberately, especially on large projects.
