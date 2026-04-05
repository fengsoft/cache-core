---
title: "CacheCore"
description: "Reusable caching layer for SaaS backends with namespacing, tenant-aware keys, TTLs, tags, metrics, and an optional admin API."
---

CacheCore is a reusable caching layer for SaaS backends, with explicit namespacing, tenant-aware keys, invalidation, metrics, and an optional admin API.

## What is in the repository

- 7 workspace packages
- 1 runtime applications
- 2 runnable example integrations

## Why teams adopt QueueFlow

- you want cache behavior explicit instead of scattered through app code
- you need predictable namespacing and tenant-aware keys
- you want stale-while-revalidate and invalidation as first-class behavior
- you want caching usable as an embedded library first, with an admin sidecar when needed

## Start here

<ul>
  <li><a href="./guides/getting-started/">Quick start</a></li>
  <li><a href="./guides/architecture/">Architecture</a></li>
  <li><a href="./guides/adoption-paths/">Adoption paths</a></li>
  <li><a href="./guides/operate-cache-core/">Operate CacheCore</a></li>
  <li><a href="./guides/maturity-and-scope/">Maturity and scope</a></li>
  <li><a href="./packages/">Package reference</a></li>
  <li><a href="./runtimes/">Runtime reference</a></li>
  <li><a href="./examples/">Examples</a></li>
</ul>

## How the pieces fit together

```text
your backend or service
  -> @saazip/cache-core
     -> contracts + core + metrics
     -> adapters-redis for shared storage
  -> cache-core admin api
     -> invalidation, warm, and metrics operations
```

## What QueueFlow owns

- cache lifecycle primitives like remember, invalidation, and metadata-aware reads
- the namespace and tag model for keeping keys predictable
- cache metrics primitives and the optional admin API surface
- official adapter seams like Redis for durable shared cache usage

## What your app still owns

- which reads should be cached and for how long
- your cache key, tag, and invalidation strategy at the product level
- which operational invalidation or warm-up flows you expose internally

## Current maturity

- already useful as a library-first cache foundation
- best for backend teams who want explicit caching policy and metrics
- still opinionated toward backend caching, not generic storage abstraction

> Source repository: [saazip/cache-core](https://github.com/saazip/cache-core)
