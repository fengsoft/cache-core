---
title: "HTTP cache example"
description: "Minimal embedded usage showing remember, stale reads, background refresh, invalidation, and metrics."
sidebar:
  order: 2
---

> Sources: [`examples/http-cache/README.md`](https://github.com/fengsoft/cache-core/blob/main/examples/http-cache/README.md) | [`examples/http-cache/index.ts`](https://github.com/fengsoft/cache-core/blob/main/examples/http-cache/index.ts)

## Purpose

Minimal embedded usage showing remember, stale reads, background refresh, invalidation, and metrics.

## Start here if

- teams who want to start with CacheCore as a library inside another backend

## What it demonstrates

- read-through caching with remember
- stale-while-revalidate behavior
- tag invalidation and metrics inspection

## Workspace details

- Example path: `examples/http-cache`
- Run command: `pnpm example:http-cache`

## Try this first

```bash
pnpm example:http-cache
```

## Expected outcome

- the example warms a key, serves a stale read once, refreshes in the background, invalidates by tag, and prints metrics
