# CacheCore

[![CI](https://github.com/fengsoft/cache-core/actions/workflows/ci.yml/badge.svg)](https://github.com/fengsoft/cache-core/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40fengsoft%2Fcache-core.svg)](https://www.npmjs.com/package/@fengsoft/cache-core)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

CacheCore is a reusable caching layer for SaaS backends with support for
namespacing, TTL, tag-based invalidation, metrics, and tenant-aware keys.

It is intentionally positioned as a structured cache library plus a reference
admin API, not as a thin Redis wrapper.

This repository is meant to be a real backend caching foundation, with explicit
policies and operational behavior.

## Why CacheCore

CacheCore exists for teams that want caching to stay predictable as systems get
larger.

- enforce consistent key construction
- scope keys by namespace and tenant
- make invalidation explicit instead of magical
- support tag-based invalidation
- expose metrics that help operating the cache
- keep the core usable without forcing a specific application shape

Typical use cases:

- caching aggregate reads
- tenant-scoped response caches
- schema and configuration lookups
- temporary read-through acceleration

## What CacheCore is not

- not automatic ORM caching
- not a generic abstraction over every cache backend in v1
- not a substitute for authoritative storage

## Quick start

```bash
cp .env.example .env
docker compose up -d redis
bun install
bun run dev:admin-api
```

Local services:

- Admin API: `http://localhost:3040`
- Redis: `localhost:6379`

Operational defaults:

- `/health` and `/ready` stay open for probes
- `/v1/*` can be protected with `API_KEYS`
- requests may send `x-request-id`, which is echoed back or generated
- the SDK supports stale-while-revalidate through `remember()` and `getWithMetadata()`

## How to adopt CacheCore

You can reuse CacheCore in three ways:

### 1. Use it as a library inside another backend

This is the default adoption path for CacheCore.

- your product uses `@fengsoft/cache-core` directly
- CacheCore provides namespacing, invalidation rules, and metrics primitives
- useful when caching should stay close to application reads and writes

### 2. Run the admin API as an operational sidecar

Use the admin API when you want a standard operational surface for warming,
invalidating, or inspecting cache behavior.

- useful for shared platform operations
- good when multiple services use the same Redis-backed cache conventions

### 3. Extend it in your product

Keep CacheCore generic and define product-specific keys, policies, and tag
strategy in the consuming application.

- CacheCore owns cache mechanics
- your product owns which reads are cached and when they are invalidated
- useful when you want reuse without building a one-size-fits-all cache abstraction

## Distribution

CacheCore is library-first.

Primary package:

- `@fengsoft/cache-core`

Supporting published packages used by the SDK:

- `@fengsoft/cache-core-contracts`
- `@fengsoft/cache-core-domain`
- `@fengsoft/cache-core-metrics`

Repo-local pieces that stay internal for now:

- admin API application
- Redis adapter package
- testing helpers

## Repository map

```txt
apps/
  admin-api/          Reference operational API for invalidation and metrics
packages/
  core/               Key policy, namespacing, and invalidation model
  contracts/          Public HTTP contracts
  metrics/            Metric names and helpers
  sdk/                Public package published as @fengsoft/cache-core
  adapters/redis/     Official Redis adapter
  testing/            Fixtures for downstream adopters
docs/                 Architecture, concepts, operations, ADRs
examples/             Reference integration examples
docker/               Local infrastructure config
```

## For contributors

If you want to contribute, start here:

1. Read this README for product boundaries.
2. Read [docs/README.md](./docs/README.md) for the docs map.
3. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before changing cache semantics or invalidation behavior.

Useful commands:

```bash
bun run ci
bun run dev:admin-api
bun run example:http-cache
```

Contribution areas that add value early:

- Redis adapter hardening
- invalidation strategy and tag index behavior
- metrics and observability exports
- docs, examples, and operational guidance

## Project docs

- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Architecture and concepts](./docs/README.md)
- [API reference](./docs/reference/openapi.yaml)
- [Compose with the Fengsoft infra suite](./docs/guides/compose-with-fengsoft-suite.md)
- [Release checklist](./docs/operations/release-checklist.md)
- [HTTP cache example](./examples/http-cache/README.md)
- [Suite e2e example](./examples/fengsoft-suite-e2e/README.md)

## Compatibility

- Bun `1.3.x`
- Redis `7+` for the official adapter
- npm package available as `@fengsoft/cache-core`

## Related projects

- `@fengsoft/queueflow` can cache metrics and read models, never job truth
- `@fengsoft/eventflow` can cache schema lookups and aggregate reads
- `@fengsoft/webhook-core` can cache endpoint and subscription snapshots

## License

Apache-2.0
