---
title: Features
description: How to design feature schemas that produce reliable structured outputs.
---

# Features

Features are the fields Atlas extracts from each paper. Your feature schema determines the shape of the results table.

## Feature Design

Prefer features that are specific and checkable.

Less useful:

> Describe the study.

More useful:

> What population was studied?

Even better:

> What was the participant population or dataset population used in the primary experiment?

## Feature Types

| Type      | Use when                                            |
| --------- | --------------------------------------------------- |
| `text`    | The answer is open-ended.                           |
| `number`  | The answer should be numeric.                       |
| `boolean` | The answer is yes/no.                               |
| `enum`    | The answer should be one of a fixed set of options. |
| `parent`  | You need a grouping node for nested features.       |

## Writing Feature Prompts

A good feature prompt should say:

- what to extract
- what counts as evidence
- what to do when the paper does not report the value
- whether to prefer exact quotes, normalized values, or short summaries

## Schema Strategy

Start with a small schema and expand after reviewing results.

For screening workflows, use boolean and enum features early. For synthesis workflows, use text and number features to capture details you will analyze later.
