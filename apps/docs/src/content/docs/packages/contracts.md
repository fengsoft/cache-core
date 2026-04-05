---
title: "@saazip/cache-core-contracts"
description: "Public HTTP and cache-surface contracts for invalidation, warming, metrics, and admin API responses."
sidebar:
  order: 2
---

> Sources: [`packages/contracts/package.json`](https://github.com/saazip/cache-core/blob/main/packages/contracts/package.json) | [`packages/contracts/src/index.ts`](https://github.com/saazip/cache-core/blob/main/packages/contracts/src/index.ts)

## Purpose

Public HTTP and cache-surface contracts for invalidation, warming, metrics, and admin API responses.

## What it gives you

- validated admin API contracts
- a stable contract layer shared by the SDK and admin API

## Use this when

- another service needs typed access to CacheCore admin surfaces
- you want invalidation and metrics contracts to stay explicit

## Workspace details

- Package name: `@saazip/cache-core-contracts`
- Workspace path: `packages/contracts`

## Internal dependencies

- None

## External dependencies

- `zod`

## Usually paired with

- [`@saazip/cache-core`](../sdk/)
- [`@saazip/cache-core-core`](../core/)
- [`@saazip/cache-core-metrics`](../metrics/)

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
