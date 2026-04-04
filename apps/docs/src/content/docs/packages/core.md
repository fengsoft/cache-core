---
title: "@fengsoft/cache-core-domain"
description: "Key policy, namespacing, invalidation, stale-while-revalidate, and cache lifecycle primitives."
sidebar:
  order: 3
---

> Sources: [`packages/core/package.json`](https://github.com/fengsoft/cache-core/blob/main/packages/core/package.json) | [`packages/core/src/index.ts`](https://github.com/fengsoft/cache-core/blob/main/packages/core/src/index.ts)

## Purpose

Key policy, namespacing, invalidation, stale-while-revalidate, and cache lifecycle primitives.

## What it gives you

- the main cache lifecycle model
- tenant-aware namespacing and key construction
- invalidation and remember/get primitives

## Use this when

- you want CacheCore embedded directly in another backend
- you need consistent cache semantics without hand-rolled wrappers

## Workspace details

- Package name: `@fengsoft/cache-core-domain`
- Workspace path: `packages/core`

## Internal dependencies

- None

## External dependencies

- None

## Usually paired with

- [`@fengsoft/cache-core-contracts`](../contracts/)
- [`@fengsoft/cache-core-metrics`](../metrics/)
- [`@fengsoft/cache-core-adapters-redis`](../adapters-redis/)
- [`@fengsoft/cache-core`](../sdk/)

## Scripts

- `build`: `bun build ./src/index.ts --outdir ./dist --target bun && tsc -p tsconfig.build.json`
