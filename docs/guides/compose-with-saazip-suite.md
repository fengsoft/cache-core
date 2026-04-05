# Compose with the Saazip infra suite

CacheCore is the shared optimization layer in the suite.

## Typical composition

1. QueueFlow exposes job or queue summaries through an API.
2. EventFlow exposes schema or metric reads.
3. WebhookCore resolves endpoint registries and active subscription views.
4. CacheCore accelerates those read paths with explicit namespace, tenant and tag rules.

## When CacheCore is enough on its own

- read-through API caching
- tenant-aware configuration lookups
- low-cardinality tag invalidation
- response acceleration close to the application layer

## When to add the other projects

- Add QueueFlow when the data being cached comes from async job orchestration.
- Add EventFlow when cacheable reads are derived from raw events and aggregations.
- Add WebhookCore when endpoint or subscription snapshots become a read hot spot.

## Boundary rule

CacheCore owns key policy, invalidation and cache metrics.
The product owns what should be cached and when authoritative state changes.
