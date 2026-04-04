---
title: "Maturity and scope"
description: "What CacheCore is already good at, and what it is intentionally not trying to be."
---

CacheCore is already valuable when you want a reusable cache foundation with explicit keys, tags, invalidation, and metrics.

## Already strong today

- embedded library-first adoption
- explicit key namespacing and tenant scoping
- stale-while-revalidate behavior
- tag invalidation
- metrics around cache behavior

## Opinionated by design

CacheCore is not trying to be:

- automatic ORM caching
- a replacement for authoritative storage
- a generic abstraction over every cache backend in v1

## Good fit

- backend read acceleration
- aggregate or config lookups
- dashboard and control-plane read models

## Weak fit

- teams that want magic caching with no explicit policy
- systems where cache invalidation rules are too product-specific to share safely
