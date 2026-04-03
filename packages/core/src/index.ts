export interface CacheNamespace {
  service: string;
  domain: string;
}

export interface CachePolicy {
  ttlSeconds: number;
  staleWhileRevalidateSeconds?: number;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  tags: string[];
  expiresAt: string;
}

export interface CacheMetricSnapshot {
  hits: number;
  misses: number;
  invalidations: number;
}

export function buildCacheKey(
  namespace: CacheNamespace,
  tenantId: string,
  segments: string[],
) {
  return [namespace.service, namespace.domain, tenantId, ...segments].join(":");
}

export function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags)).sort();
}

export function createCachePolicy(
  ttlSeconds: number,
  staleWhileRevalidateSeconds?: number,
): CachePolicy {
  return {
    ttlSeconds,
    staleWhileRevalidateSeconds,
  };
}

export function shouldRefreshEntry(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}
