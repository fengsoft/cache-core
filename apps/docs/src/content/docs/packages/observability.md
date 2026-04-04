---
title: "@fengsoft/cache-core-observability"
description: "Metrics, logging, and tracing helpers shared across the admin API and operational flows."
sidebar:
  order: 5
---

> Sources: [`packages/observability/package.json`](https://github.com/fengsoft/cache-core/blob/main/packages/observability/package.json) | [`packages/observability/src/index.ts`](https://github.com/fengsoft/cache-core/blob/main/packages/observability/src/index.ts)

## Purpose

Metrics, logging, and tracing helpers shared across the admin API and operational flows.

## What it gives you

- Prometheus metric names and helpers
- request correlation and JSON logging
- optional OTLP tracing bootstrap

## Use this when

- you want CacheCore telemetry to stay consistent across embedded and sidecar surfaces

## Workspace details

- Package name: `@fengsoft/cache-core-observability`
- Workspace path: `packages/observability`

## Internal dependencies

- None

## External dependencies

- None

## Usually paired with

- [`@fengsoft/cache-core-admin-api`](../admin-api/)
- [`@fengsoft/cache-core-metrics`](../metrics/)

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
