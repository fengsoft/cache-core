# SLO Baseline

## Proposed SLIs

- cache hit ratio
- cache write success rate
- invalidation success rate
- p95 get latency
- stale read rate

## Initial targets

- hit ratio on adopted namespaces: `>= 80%`
- cache write success rate: `>= 99.9%`
- p95 get latency: `< 10ms` inside the same network boundary
- stale read incidents: `0` after explicit invalidation

## Ownership

- platform team owns adapter reliability and invalidation tooling
- consumer teams own key design and namespace adoption
