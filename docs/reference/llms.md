---
title: LLM-Readable Docs
description: How Atlas publishes llms.txt and markdown copies for LLM clients.
---

# LLM-Readable Docs

Atlas docs use `vitepress-plugin-llms` to publish LLM-readable documentation alongside the human documentation site.

During the docs build, the plugin generates files such as:

```txt
/docs/llms.txt
/docs/llms-full.txt
```

These files give LLM clients a compact map of the documentation and a fuller Markdown representation of the site.

## Page Descriptions

Each documentation page should include frontmatter like:

```md
---
title: MCP Integration
description: Connect LLM clients to Atlas through the Model Context Protocol server.
---
```

Descriptions make `llms.txt` more useful because the generated link list can explain what each page is for.

## Human Docs First

LLM-readable docs work best when the human docs are already clear. Write the guide pages for researchers and developers first; let the plugin convert that structure for LLM clients.
