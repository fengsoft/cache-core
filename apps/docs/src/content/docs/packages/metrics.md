---
title: "@saazip/cache-core-metrics"
description: "Metric names and helpers for hit ratio, invalidation, and average load timing."
sidebar:
  order: 4
---

> Sources: [`packages/metrics/package.json`](https://github.com/saazip/cache-core/blob/main/packages/metrics/package.json) | [`packages/metrics/src/index.ts`](https://github.com/saazip/cache-core/blob/main/packages/metrics/src/index.ts)

## Purpose

Metric names and helpers for hit ratio, invalidation, and average load timing.

## What it gives you

- shared metric primitives for the SDK and admin API
- a clear operational language around cache behavior

## Use this when

- you want cache hits, misses, remembers, and invalidations tracked consistently

## Workspace details

- Package name: `@saazip/cache-core-metrics`
- Workspace path: `packages/metrics`

## Internal dependencies

- [`@saazip/cache-core-domain`](../domain/)

## External dependencies

- None

## Usually paired with

- [`@saazip/cache-core-core`](../core/)
- [`@saazip/cache-core`](../sdk/)
- [`@saazip/cache-core-admin-api`](../admin-api/)

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
