---
title: Concepts
description: The product concepts behind Atlas projects, papers, features, results, inclusion criteria, repeatability, and API keys.
---

# Concepts

Atlas is organized around a few durable concepts. These are the words used across the application, API, and MCP tools.

## Project

A project is a review workspace. It represents one research question, evidence map, or dataset-building effort.

Projects collect:

- papers
- the feature schema used to read those papers
- the project-level prompt
- extraction results
- review rules and quality checks

Create a new project when the paper corpus or extraction schema should be managed independently from other work.

## Paper

A paper is a source document added to a project, usually a PDF. Atlas stores the file, tracks basic file metadata, and processes it asynchronously.

A single paper can appear in the context of a project with extracted results, review decisions, and reprocessing history.

## Feature

A feature is one structured field that Atlas extracts from a paper.

Examples:

- sample size
- study design
- population
- outcome measure
- whether a paper satisfies an inclusion rule

Features define the shape of the results table. They can be simple fields or parent nodes used to organize nested feature groups.

## Feature Schema

A project’s feature schema is the selected set of features that should be extracted from every paper in that project.

Changing the schema changes what Atlas tries to extract. Existing papers may need to be reprocessed after schema changes.

## Result

A result is the extracted output for a paper under a project’s feature schema.

Results can have versions. When a paper is reprocessed, Atlas can keep prior extraction runs while marking the current run as the latest result.

## Inclusion Criterion

An inclusion criterion is a named rule for deciding whether a paper belongs in a review.

Criteria are expressed as formulas over extracted feature values. For example, a criterion might require:

- study type is experimental
- sample size is greater than a threshold
- the paper reports a target outcome

Use inclusion criteria when screening decisions should be explicit and repeatable.

## Ground Truth

Ground truth is human-provided reference data. It is used to compare Atlas outputs against known answers.

Ground truth is useful when you want to evaluate whether a feature prompt or extraction strategy is reliable enough for a review workflow.

## Repeatability

Repeatability measures how stable extraction is across repeated runs.

If a feature produces different answers across repeated extractions, the feature may need a clearer prompt, a stricter type, or a narrower definition.

## API Key

An API key allows programmatic access to Atlas. API keys are used by scripts, SDK-like integrations, and the MCP server.

Create API keys in the web app under **Settings → API Keys**. Treat raw keys as secrets; Atlas only shows the raw key once when it is created.
