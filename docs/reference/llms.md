---
title: LLM-Readable Docs
description: Machine-readable copies of the Atlas documentation for LLM clients.
---

# LLM-Readable Docs

Atlas publishes machine-readable copies of this documentation for use with LLM clients and tools. They contain the same content as the human documentation, formatted for direct consumption by a language model.

## Available Files

```txt
https://atlas.seas.upenn.edu/docs/llms.txt
https://atlas.seas.upenn.edu/docs/llms-full.txt
```

- `llms.txt` is an index of the documentation: a list of pages with a short description of each.
- `llms-full.txt` is the full documentation combined into a single Markdown file.

## Using Them

Point an LLM client at one of these URLs to give it context about Atlas:

- Use `llms.txt` when you want a compact map of the documentation and links to individual pages.
- Use `llms-full.txt` when you want the complete documentation in one request, for example to load into a model's context.

Both files are regenerated whenever the documentation is published, so they stay in sync with the pages on this site.
