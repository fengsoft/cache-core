---
title: "@saazip/cache-core-domain"
description: "Key policy, namespacing, invalidation, stale-while-revalidate, and cache lifecycle primitives."
sidebar:
  order: 3
---

> Sources: [`packages/core/package.json`](https://github.com/saazip/cache-core/blob/main/packages/core/package.json) | [`packages/core/src/index.ts`](https://github.com/saazip/cache-core/blob/main/packages/core/src/index.ts)

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

- Package name: `@saazip/cache-core-domain`
- Workspace path: `packages/core`

## Internal dependencies

- None

## External dependencies

- None

## Usually paired with

- [`@saazip/cache-core-contracts`](../contracts/)
- [`@saazip/cache-core-metrics`](../metrics/)
- [`@saazip/cache-core-adapters-redis`](../adapters-redis/)
- [`@saazip/cache-core`](../sdk/)

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
