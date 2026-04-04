---
title: "Fengsoft suite e2e example"
description: "End-to-end example showing CacheCore composing with QueueFlow, EventFlow, and WebhookCore."
sidebar:
  order: 1
---

> Sources: [`examples/fengsoft-suite-e2e/README.md`](https://github.com/fengsoft/cache-core/blob/main/examples/fengsoft-suite-e2e/README.md) | [`examples/fengsoft-suite-e2e/index.ts`](https://github.com/fengsoft/cache-core/blob/main/examples/fengsoft-suite-e2e/index.ts)

## Purpose

End-to-end example showing CacheCore composing with QueueFlow, EventFlow, and WebhookCore.

## Start here if

- teams who want to see CacheCore used as a read-side accelerator inside the wider Fengsoft stack

## What it demonstrates

- composing cached read models with the rest of the Fengsoft runtime suite
- background refresh and admin API warming in a multi-service flow

## Workspace details

- Example path: `examples/fengsoft-suite-e2e`
- Run command: `bun run example:suite-e2e`

## Try this first

```bash
bun run example:suite-e2e
```

## Expected outcome

- the example builds a cached suite read model after QueueFlow, EventFlow, and WebhookCore complete their parts
