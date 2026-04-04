---
title: "Adoption paths"
description: "How to choose between embedded library usage, admin sidecar usage, and full suite composition."
---

## Path 1: embedded library usage

Choose this when:

- caching should stay inside the service that owns the read path
- you want direct control over key construction and invalidation

You will mostly use:

- `@fengsoft/cache-core`
- `packages/core`
- `packages/metrics`

This is the default and strongest adoption path.

## Path 2: admin sidecar usage

Choose this when:

- platform or SRE workflows need a standard invalidation or warm-up surface
- multiple services should share one operational pattern around cache behavior

You will mostly use:

- `apps/admin-api`
- `packages/contracts`
- `packages/observability`

## Path 3: compose it with the Fengsoft suite

Typical shape:

- QueueFlow dashboards and read models use CacheCore on the read side
- EventFlow schema or metrics lookups use CacheCore for acceleration
- WebhookCore endpoint and subscription reads can be cached

## What not to do

- do not treat CacheCore as authoritative storage
- do not use tags as analytics dimensions
- do not centralize every cache policy in a shared layer if product semantics differ heavily
