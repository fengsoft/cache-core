# Concepts

CacheCore standardizes cache behavior across backend services.

## Domain model

- `CacheNamespace` scopes keys by subsystem
- `CachePolicy` defines TTL and refresh expectations
- `CacheEntry` wraps the stored value
- `CacheTagIndex` tracks reverse invalidation by tag
- `InvalidationEvent` records explicit invalidation actions

