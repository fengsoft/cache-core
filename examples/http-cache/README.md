# HTTP cache example

Suggested example scenario:

1. a metrics endpoint reads from CacheCore
2. misses fetch from authoritative storage
3. entries are stored with tenant-aware keys
4. a write path invalidates by tag
5. admin API exposes current cache metrics

