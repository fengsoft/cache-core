# HTTP cache example

Suggested example scenario:

1. a metrics endpoint reads from CacheCore
2. misses fetch from authoritative storage
3. entries are stored with tenant-aware keys
4. stale reads are served once while a background refresh updates the entry
5. a write path invalidates by tag
6. admin API exposes current cache metrics

## Run

Run the in-memory SDK example:

```bash
bun run example:http-cache
```

Optional environment variables:

- `CACHECORE_TENANT_ID`
