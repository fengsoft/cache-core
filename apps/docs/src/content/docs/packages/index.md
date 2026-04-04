---
title: "Packages"
description: "Workspace package reference for the CacheCore monorepo."
sidebar:
  label: "Overview"
  order: 0
---

CacheCore is centered on one embedded public package, plus the packages that own policy, metrics, observability, and adapter concerns.

## Public adoption package

- [`@fengsoft/cache-core`](./sdk/): The public package published as `@fengsoft/cache-core` for embedded library-first adoption.

## Embedded and operational packages

- [`@fengsoft/cache-core-contracts`](./contracts/): Public HTTP and cache-surface contracts for invalidation, warming, metrics, and admin API responses.
- [`@fengsoft/cache-core-domain`](./core/): Key policy, namespacing, invalidation, stale-while-revalidate, and cache lifecycle primitives.
- [`@fengsoft/cache-core-metrics`](./metrics/): Metric names and helpers for hit ratio, invalidation, and average load timing.
- [`@fengsoft/cache-core-observability`](./observability/): Metrics, logging, and tracing helpers shared across the admin API and operational flows.
- [`@fengsoft/cache-core-testing`](./testing/): Test helpers and fixtures for downstream CacheCore adoption.
- [`@fengsoft/cache-core-adapter-redis`](./adapters-redis/): Official Redis adapter for multi-instance, durable cache storage and tag coordination.
