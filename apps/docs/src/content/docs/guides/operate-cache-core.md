---
title: "Operate CacheCore"
description: "The first operational signals and boundaries to watch in CacheCore."
---

## Signals to watch first

- hit ratio
- invalidation volume
- average load duration
- warm request volume
- stale reads that are expected versus accidental

## Useful surfaces

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /v1/metrics`
- `POST /v1/invalidate`
- `POST /v1/warm`

## Good operational posture

- keep tags low-cardinality and stable
- protect the admin API behind network boundaries
- use Redis-backed adapters for multi-instance deployments
- treat stale-while-revalidate as a policy choice, not a blanket default

## Failure modes worth rehearsing

- expired entries: should be observable as misses
- stale entries: should serve old data once and refresh in the background
- tag invalidation: should clear both entry state and tag index state
- cold start pressure: should show up in load duration metrics
