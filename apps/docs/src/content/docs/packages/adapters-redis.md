---
title: "@fengsoft/cache-core-adapter-redis"
description: "Official Redis adapter for multi-instance, durable cache storage and tag coordination."
sidebar:
  order: 1
---

> Sources: [`packages/adapters/redis/package.json`](https://github.com/fengsoft/cache-core/blob/main/packages/adapters/redis/package.json) | [`packages/adapters/redis/src/index.ts`](https://github.com/fengsoft/cache-core/blob/main/packages/adapters/redis/src/index.ts)

## Purpose

Official Redis adapter for multi-instance, durable cache storage and tag coordination.

## What it gives you

- Redis-backed storage for cache entries and tag invalidation support

## Use this when

- you want CacheCore beyond in-memory usage and into shared Redis-backed environments

## Workspace details

- Package name: `@fengsoft/cache-core-adapter-redis`
- Workspace path: `packages/adapters/redis`

## Internal dependencies

- None

## External dependencies

- `ioredis`

## Usually paired with

- [`@fengsoft/cache-core-core`](../core/)
- [`@fengsoft/cache-core`](../sdk/)
