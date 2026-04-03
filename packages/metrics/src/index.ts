import type { CacheMetricSnapshot } from "@fengsoft/cache-core-domain";

export const cacheMetricNames = {
  hitTotal: "cache_core_hit_total",
  missTotal: "cache_core_miss_total",
  invalidationTotal: "cache_core_invalidation_total",
} as const;

export function createCacheMetricSnapshot(snapshot: CacheMetricSnapshot) {
  return snapshot;
}
