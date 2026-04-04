---
title: "Architecture"
description: "How CacheCore separates embedded cache policy from optional operational surfaces."
---

CacheCore is intentionally library-first. The main architecture choice is to keep cache behavior close to the consuming app, with an optional sidecar for operational workflows.

## Core shape

```text
your backend or service
  -> @fengsoft/cache-core
     -> contracts + core + metrics
     -> adapters-redis for shared storage
  -> cache-core admin api
     -> invalidation, warm, and metrics operations
```

## The central design choice

CacheCore is not trying to hide caching behind magic.

That means it cares about:

- explicit key construction
- tenant-aware namespacing
- visible invalidation
- metrics around hits, misses, loads, and invalidations

## Embedded library path

This is the default adoption path.

The embedded path owns:

- read-through caching
- stale-while-revalidate behavior
- tag invalidation
- product-level cache policy

## Admin API path

The admin API exists for operational workflows:

- warm requests
- invalidation requests
- metrics snapshots

It should feel like a sidecar, not the main way application code uses CacheCore.

## Product boundary

CacheCore owns cache mechanics.

Your product owns:

- what gets cached
- when invalidation happens
- how conservative or aggressive cache policy should be
