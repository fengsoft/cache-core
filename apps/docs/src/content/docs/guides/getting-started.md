---
title: "Quick start"
description: "The fastest useful path to run CacheCore locally and verify embedded caching plus the admin API."
---

CacheCore is library-first. The shortest useful path is to run the example, and then optionally boot the admin API if you want the operational surface too.

## Prerequisites

- Bun `1.1.x`
- Redis if you want the official adapter path

## Local bootstrap

```bash
cp .env.example .env
docker compose up -d redis
bun install
bun run dev:admin-api
```

Local surfaces:

- Admin API: `http://localhost:3040`
- Redis: `localhost:6379`

## First useful checks

```bash
curl http://127.0.0.1:3040/health
curl http://127.0.0.1:3040/ready
curl http://127.0.0.1:3040/metrics
```

## First embedded flow

```bash
bun run example:http-cache
```

The example:

- warms a cache entry
- serves a stale read once
- refreshes in the background
- invalidates by tag
- prints cache metrics

## What you should understand after 5 minutes

- CacheCore is primarily meant to be embedded in another backend
- namespacing and tags are part of the product contract, not incidental details
- stale-while-revalidate is explicit and observable
- the admin API is an optional operational companion, not the center of the architecture
