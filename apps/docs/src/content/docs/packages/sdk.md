---
title: "@saazip/cache-core"
description: "The public package published as `@saazip/cache-core` for embedded library-first adoption."
sidebar:
  order: 6
---

> Sources: [`packages/sdk/package.json`](https://github.com/saazip/cache-core/blob/main/packages/sdk/package.json) | [`packages/sdk/src/index.ts`](https://github.com/saazip/cache-core/blob/main/packages/sdk/src/index.ts)

## Purpose

The public package published as `@saazip/cache-core` for embedded library-first adoption.

## What it gives you

- the main embedded cache API
- remember/get/getWithMetadata primitives with stale-while-revalidate support
- re-exported contracts, domain, and metric helpers

## Use this when

- caching should stay close to the consuming backend instead of becoming a remote service
- you want one stable package boundary for cache behavior

## Smallest useful setup

```ts
import { createCacheCore } from "@saazip/cache-core";

const cache = createCacheCore({
  namespace: { service: 'billing-api', domain: 'plans' },
  tenantId: "tenant_demo",
});

const value = await cache.remember(
  ['catalog', 'current'],
  async () => ({ plans: ['starter', 'pro'] }),
  { tags: ['plans'], ttlSeconds: 60 },
);
```

## Workspace details

- Package name: `@saazip/cache-core`
- Workspace path: `packages/sdk`

## Internal dependencies

- [`@saazip/cache-core-contracts`](../contracts/)
- [`@saazip/cache-core-domain`](../domain/)
- [`@saazip/cache-core-metrics`](../metrics/)

## External dependencies

- None

## Usually paired with

- [`@saazip/cache-core-contracts`](../contracts/)
- [`@saazip/cache-core-core`](../core/)
- [`@saazip/cache-core-metrics`](../metrics/)
- [`@saazip/cache-core-adapters-redis`](../adapters-redis/)

## You still own

- which reads are cached, how keys are chosen, and when invalidation should happen
- your product-specific tag strategy and cache policy decisions

## Scripts

- `build`: `tsc -p tsconfig.json`
- `typecheck`: `tsc --noEmit -p tsconfig.json`
- `lint`: `biome check src package.json tsconfig.json`
