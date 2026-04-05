import type { CacheMetricSnapshot } from "@saazip/cache-core-domain";

export const cacheMetricNames = {
	hitTotal: "cache_core_hit_total",
	missTotal: "cache_core_miss_total",
	setTotal: "cache_core_set_total",
	deleteTotal: "cache_core_delete_total",
	invalidationTotal: "cache_core_invalidation_total",
	rememberTotal: "cache_core_remember_total",
	averageLoadMs: "cache_core_average_load_ms",
} as const;

export function createCacheMetricSnapshot(
	snapshot?: Partial<CacheMetricSnapshot>,
): CacheMetricSnapshot {
	return {
		hits: snapshot?.hits ?? 0,
		misses: snapshot?.misses ?? 0,
		sets: snapshot?.sets ?? 0,
		deletes: snapshot?.deletes ?? 0,
		invalidations: snapshot?.invalidations ?? 0,
		remembers: snapshot?.remembers ?? 0,
		averageLoadMs: snapshot?.averageLoadMs ?? 0,
	};
}

export function createCacheMetricsRecorder(
	initialSnapshot?: Partial<CacheMetricSnapshot>,
) {
	const snapshot = createCacheMetricSnapshot(initialSnapshot);
	let totalLoadMs = snapshot.averageLoadMs * snapshot.remembers;

	return {
		recordHit() {
			snapshot.hits += 1;
		},
		recordMiss() {
			snapshot.misses += 1;
		},
		recordSet() {
			snapshot.sets += 1;
		},
		recordDelete() {
			snapshot.deletes += 1;
		},
		recordInvalidation(count = 1) {
			snapshot.invalidations += count;
		},
		recordRemember(loadMs: number) {
			snapshot.remembers += 1;
			totalLoadMs += loadMs;
			snapshot.averageLoadMs = Number(
				(totalLoadMs / snapshot.remembers).toFixed(2),
			);
		},
		snapshot() {
			return {
				...snapshot,
			};
		},
	};
}
