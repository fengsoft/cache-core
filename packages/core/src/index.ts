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
  createdAt: string;
  expiresAt: string;
  staleUntil?: string;
}

export interface CacheTagIndex {
  tag: string;
  keys: string[];
  updatedAt: string;
}

export interface InvalidationEvent {
  id: string;
  namespace: string;
  tenantId?: string;
  kind: "key" | "tag";
  target: string;
  createdAt: string;
}

export interface CacheMetricSnapshot {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  invalidations: number;
  remembers: number;
  averageLoadMs: number;
}

export type CacheEntryState = "fresh" | "stale" | "expired";

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

export interface CacheTagStore {
  add(tag: string, key: string): Promise<void>;
  list(tag: string): Promise<string[]>;
  clear(tag: string): Promise<void>;
  removeKey?(key: string): Promise<void>;
}

export interface CacheSerializer {
  serialize<T>(value: T): string;
  deserialize<T>(value: string): T;
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

export function canServeStaleEntry(
  entry: Pick<CacheEntry<unknown>, "expiresAt" | "staleUntil">,
) {
  if (!entry.staleUntil) {
    return false;
  }

  const now = Date.now();
  return (
    new Date(entry.expiresAt).getTime() <= now &&
    new Date(entry.staleUntil).getTime() > now
  );
}

export function resolveCacheEntryState(
  entry: Pick<CacheEntry<unknown>, "expiresAt" | "staleUntil">,
): CacheEntryState {
  if (!shouldRefreshEntry(entry.expiresAt)) {
    return "fresh";
  }

  if (canServeStaleEntry(entry)) {
    return "stale";
  }

  return "expired";
}

export function createCacheEntry<T>(input: {
  key: string;
  value: T;
  tags?: string[];
  policy: CachePolicy;
  createdAt?: Date;
}): CacheEntry<T> {
  const createdAt = input.createdAt ?? new Date();
  return {
    key: input.key,
    value: input.value,
    tags: normalizeTags(input.tags ?? []),
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(
      createdAt.getTime() + input.policy.ttlSeconds * 1_000,
    ).toISOString(),
    staleUntil: input.policy.staleWhileRevalidateSeconds
      ? new Date(
          createdAt.getTime() +
            (input.policy.ttlSeconds +
              input.policy.staleWhileRevalidateSeconds) *
              1_000,
        ).toISOString()
      : undefined,
  };
}

export function createInvalidationEvent(input: {
  namespace: string;
  tenantId?: string;
  kind: "key" | "tag";
  target: string;
}): InvalidationEvent {
  return {
    id: crypto.randomUUID(),
    namespace: input.namespace,
    tenantId: input.tenantId,
    kind: input.kind,
    target: input.target,
    createdAt: new Date().toISOString(),
  };
}

export function createJsonSerializer(): CacheSerializer {
  return {
    serialize(value) {
      return JSON.stringify(value);
    },
    deserialize(value) {
      return JSON.parse(value) as never;
    },
  };
}

export function createInMemoryCacheStore() {
  const values = new Map<string, string>();

  return {
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async set(key: string, value: string) {
      values.set(key, value);
    },
    async del(key: string) {
      values.delete(key);
    },
  } satisfies CacheStore;
}

export function createInMemoryTagStore() {
  const tags = new Map<string, Set<string>>();

  return {
    async add(tag: string, key: string) {
      const current = tags.get(tag) ?? new Set<string>();
      current.add(key);
      tags.set(tag, current);
    },
    async list(tag: string) {
      return Array.from(tags.get(tag) ?? []);
    },
    async clear(tag: string) {
      tags.delete(tag);
    },
    async removeKey(key: string) {
      for (const values of tags.values()) {
        values.delete(key);
      }
    },
  } satisfies CacheTagStore;
}
