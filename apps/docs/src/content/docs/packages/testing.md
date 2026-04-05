---
title: "@saazip/cache-core-testing"
description: "Test helpers and fixtures for downstream CacheCore adoption."
sidebar:
  order: 7
---

> Sources: [`packages/testing/package.json`](https://github.com/saazip/cache-core/blob/main/packages/testing/package.json) | [`packages/testing/src/index.ts`](https://github.com/saazip/cache-core/blob/main/packages/testing/src/index.ts)

## Purpose

Test helpers and fixtures for downstream CacheCore adoption.

## What it gives you

- a dedicated place for cache fixtures and harnesses
- a reusable seam for product-level cache integration tests

## Use this when

- your product wants to test CacheCore-backed flows consistently

## Workspace details

- Package name: `@saazip/cache-core-testing`
- Workspace path: `packages/testing`

## Internal dependencies

- None

## External dependencies

- None

## Usually paired with

- [`@saazip/cache-core-core`](../core/)
- [`@saazip/cache-core`](../sdk/)

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
