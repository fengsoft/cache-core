# Architecture

CacheCore separates concerns into:

- domain rules for keys, tags, and policies
- storage adapters, starting with Redis
- optional admin API for operational tasks
- metrics helpers for hit/miss instrumentation

The library is designed to be embedded by services or used standalone.

