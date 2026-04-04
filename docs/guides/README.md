# Guides

## Run locally

1. Copy `.env.example` to `.env`.
2. Start Redis with `docker compose up -d redis`.
3. Run the admin API with `bun run dev:admin-api`.
4. Use `GET /health`, `GET /ready`, `GET /metrics` and `GET /v1/metrics` to validate the setup.

## Integrate in another backend

- Use `createCacheCore()` for embedded library usage.
- Use `getWithMetadata()` when the caller needs to distinguish fresh hits from stale reads.
- Reserve the admin API for operational invalidation and warm-up flows.
- Build keys through namespaces and tenant scoping instead of raw string concatenation.
- Keep tags stable and low-cardinality; use them for invalidation, not for analytics.

## Operate in production

- Treat the admin API as a sidecar and protect it with network boundaries.
- Track hit ratio, invalidation volume and average load duration together.
- Prefer Redis-backed tag stores for multi-instance deployments.
- Use `staleWhileRevalidateSeconds` only on reads that can tolerate brief staleness while refresh runs in the background.
- Use `NPM_TOKEN` only in release automation, never in repo-local files.

## Failure modes

- Expired entries: they are evicted lazily on read and counted as misses.
- Stale entries: `remember()` serves the old value once and refreshes it asynchronously inside the grace window.
- Tag invalidation: all keys under the tag are removed before the tag index is cleared.
- Namespace drift: `withNamespace()` prevents accidental collisions between bounded contexts.
- Cold start pressure: `remember()` records load latency so warm-up regressions are visible.

## Compose with the suite

- Use CacheCore in front of QueueFlow dashboards and EventFlow read APIs.
- Cache endpoint registries for WebhookCore, but keep delivery state authoritative elsewhere.
- Treat CacheCore as an optimization layer, never as the primary source of truth.
- See [`compose-with-fengsoft-suite.md`](./compose-with-fengsoft-suite.md) for a concrete shared-flow example.
