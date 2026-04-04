---
title: "@fengsoft/cache-core-admin-api"
description: "Operational sidecar API for invalidation, warm requests, metrics, and cache admin workflows."
sidebar:
  order: 1
---

> Sources: [`apps/admin-api/package.json`](https://github.com/fengsoft/cache-core/blob/main/apps/admin-api/package.json) | [`apps/admin-api/src/index.ts`](https://github.com/fengsoft/cache-core/blob/main/apps/admin-api/src/index.ts)

## Purpose

Operational sidecar API for invalidation, warm requests, metrics, and cache admin workflows.

## Responsibilities

- accept invalidation requests
- accept warm requests
- serve health, readiness, and metrics surfaces
- expose admin-friendly cache snapshots

## Start here if

- teams who want an explicit operational surface around CacheCore behavior
- shared platforms that use the same cache conventions across services

## Workspace details

- Package name: `@fengsoft/cache-core-admin-api`
- Workspace path: `apps/admin-api`
- Run command: `bun run dev:admin-api`
- Local surface: `http://127.0.0.1:3040`

## Internal dependencies

- [`@fengsoft/cache-core-contracts`](../../packages/contracts/)
- [`@fengsoft/cache-core-domain`](../../packages/domain/)
- [`@fengsoft/cache-core-metrics`](../../packages/metrics/)
- [`@fengsoft/cache-core-observability`](../../packages/observability/)

## External dependencies

- `elysia`

## Current routes

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `POST /v1/invalidate`
- `POST /v1/warm`
- `GET /v1/metrics`

## You still own

- your actual product cache policy and which operations are safe to expose internally

## Scripts

- `dev`: `bun --watch src/index.ts`
- `build`: `bun build ./src/index.ts --outdir ./dist --target bun`
