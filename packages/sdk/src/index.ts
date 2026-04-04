import type {
  InvalidateRequest,
  WarmRequest,
} from "@fengsoft/cache-core-contracts";
import {
  type CacheEntryState,
  type CacheNamespace,
  type CachePolicy,
  type CacheStore,
  type CacheTagStore,
  buildCacheKey,
  createCachePolicy,
  createInMemoryCacheStore,
  createInMemoryTagStore,
  createInvalidationEvent,
  createJsonSerializer,
  normalizeTags,
  resolveCacheEntryState,
} from "@fengsoft/cache-core-domain";
import { createCacheEntry } from "@fengsoft/cache-core-domain";
import { createCacheMetricsRecorder } from "@fengsoft/cache-core-metrics";

export * from "@fengsoft/cache-core-contracts";
export * from "@fengsoft/cache-core-domain";
export * from "@fengsoft/cache-core-metrics";

type KeyLike = string | string[];

export interface CacheCoreClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export interface CacheCoreOptions {
  namespace: CacheNamespace;
  store?: CacheStore;
  tagStore?: CacheTagStore;
  tenantId?: string;
  defaultPolicy?: CachePolicy;
}

export interface CacheWriteOptions {
  tenantId?: string;
  tags?: string[];
  ttlSeconds?: number;
  staleWhileRevalidateSeconds?: number;
}

export interface CacheReadResult<T> {
  key: string;
  value: T | null;
  state: Exclude<CacheEntryState, "expired"> | "miss";
  expiresAt?: string;
  staleUntil?: string;
}

function toSegments(key: KeyLike) {
  return Array.isArray(key) ? key : [key];
}

function createHeaders(apiKey?: string) {
  return {
    "content-type": "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

export function createCacheCore(options: CacheCoreOptions) {
  const store = options.store ?? createInMemoryCacheStore();
  const tagStore = options.tagStore ?? createInMemoryTagStore();
  const serializer = createJsonSerializer();
  const metrics = createCacheMetricsRecorder();
  const refreshes = new Map<string, Promise<void>>();
  const tenantId = options.tenantId ?? "global";
  const defaultPolicy = options.defaultPolicy ?? createCachePolicy(300);

  function resolvePolicy(writeOptions?: CacheWriteOptions): CachePolicy {
    return createCachePolicy(
      writeOptions?.ttlSeconds ?? defaultPolicy.ttlSeconds,
      writeOptions?.staleWhileRevalidateSeconds ??
        defaultPolicy.staleWhileRevalidateSeconds,
    );
  }

  function resolveKey(key: KeyLike, writeOptions?: CacheWriteOptions) {
    return buildCacheKey(
      options.namespace,
      writeOptions?.tenantId ?? tenantId,
      toSegments(key),
    );
  }

  async function readValue<T>(
    key: KeyLike,
    writeOptions?: CacheWriteOptions,
  ): Promise<CacheReadResult<T>> {
    const cacheKey = resolveKey(key, writeOptions);
    const current = await store.get(cacheKey);

    if (!current) {
      metrics.recordMiss();
      return {
        key: cacheKey,
        value: null,
        state: "miss",
      };
    }

    const parsed = JSON.parse(current) as ReturnType<
      typeof createCacheEntry<string>
    >;

    const entryState = resolveCacheEntryState(parsed);

    if (entryState === "expired") {
      await store.del(cacheKey);
      await tagStore.removeKey?.(cacheKey);
      metrics.recordMiss();
      return {
        key: cacheKey,
        value: null,
        state: "miss",
      };
    }

    metrics.recordHit();
    return {
      key: cacheKey,
      value: serializer.deserialize<T>(parsed.value),
      state: entryState,
      expiresAt: parsed.expiresAt,
      staleUntil: parsed.staleUntil,
    };
  }

  async function writeValue<T>(
    key: KeyLike,
    value: T,
    writeOptions?: CacheWriteOptions,
  ) {
    const cacheKey = resolveKey(key, writeOptions);
    const policy = resolvePolicy(writeOptions);
    const entry = createCacheEntry({
      key: cacheKey,
      value: serializer.serialize(value),
      tags: normalizeTags(writeOptions?.tags ?? []),
      policy,
    });
    const storageTtl =
      policy.ttlSeconds + (policy.staleWhileRevalidateSeconds ?? 0);

    await store.set(cacheKey, JSON.stringify(entry), storageTtl);

    for (const tag of entry.tags) {
      await tagStore.add(tag, cacheKey);
    }

    metrics.recordSet();
    return entry;
  }

  function scheduleRefresh<T>(
    key: KeyLike,
    loader: () => Promise<T> | T,
    writeOptions?: CacheWriteOptions,
  ) {
    const cacheKey = resolveKey(key, writeOptions);

    if (refreshes.has(cacheKey)) {
      return refreshes.get(cacheKey);
    }

    const refresh = Promise.resolve()
      .then(async () => {
        const startedAt = performance.now();
        const value = await loader();
        await writeValue(key, value, writeOptions);
        metrics.recordRemember(
          Math.round((performance.now() - startedAt) * 100) / 100,
        );
      })
      .catch(() => {
        // Keep serving stale data until the grace window ends.
      })
      .finally(() => {
        refreshes.delete(cacheKey);
      });

    refreshes.set(cacheKey, refresh);
    return refresh;
  }

  return {
    async get<T>(key: KeyLike, writeOptions?: CacheWriteOptions) {
      const result = await readValue<T>(key, writeOptions);
      return result.value;
    },
    getWithMetadata: readValue,
    set: writeValue,
    async delete(key: KeyLike, writeOptions?: CacheWriteOptions) {
      const cacheKey = resolveKey(key, writeOptions);
      await store.del(cacheKey);
      await tagStore.removeKey?.(cacheKey);
      metrics.recordDelete();
    },
    async remember<T>(
      key: KeyLike,
      loader: () => Promise<T> | T,
      writeOptions?: CacheWriteOptions,
    ) {
      const existing = await readValue<T>(key, writeOptions);

      if (existing.state === "fresh") {
        return existing.value as T;
      }

      if (existing.state === "stale") {
        scheduleRefresh(key, loader, writeOptions);
        return existing.value as T;
      }

      const startedAt = performance.now();
      const value = await loader();
      await writeValue(key, value, writeOptions);
      metrics.recordRemember(
        Math.round((performance.now() - startedAt) * 100) / 100,
      );
      return value;
    },
    async invalidateKey(key: KeyLike, writeOptions?: CacheWriteOptions) {
      const cacheKey = resolveKey(key, writeOptions);
      await store.del(cacheKey);
      await tagStore.removeKey?.(cacheKey);
      refreshes.delete(cacheKey);
      metrics.recordInvalidation();
      return createInvalidationEvent({
        namespace: `${options.namespace.service}:${options.namespace.domain}`,
        tenantId: writeOptions?.tenantId ?? tenantId,
        kind: "key",
        target: cacheKey,
      });
    },
    async invalidateTag(tag: string, writeOptions?: CacheWriteOptions) {
      const keys = await tagStore.list(tag);

      for (const key of keys) {
        await store.del(key);
        refreshes.delete(key);
      }

      await tagStore.clear(tag);
      metrics.recordInvalidation(keys.length === 0 ? 1 : keys.length);
      return createInvalidationEvent({
        namespace: `${options.namespace.service}:${options.namespace.domain}`,
        tenantId: writeOptions?.tenantId ?? tenantId,
        kind: "tag",
        target: tag,
      });
    },
    withNamespace(namespace: CacheNamespace) {
      return createCacheCore({
        ...options,
        namespace,
        store,
        tagStore,
        tenantId,
        defaultPolicy,
      });
    },
    withTenant(nextTenantId: string) {
      return createCacheCore({
        ...options,
        store,
        tagStore,
        tenantId: nextTenantId,
        defaultPolicy,
      });
    },
    getMetrics() {
      return metrics.snapshot();
    },
    async waitForRefresh(key: KeyLike, writeOptions?: CacheWriteOptions) {
      await refreshes.get(resolveKey(key, writeOptions));
    },
  };
}

export function createCacheCoreClient(options: CacheCoreClientOptions) {
  const headers = createHeaders(options.apiKey);

  return {
    invalidate(input: InvalidateRequest) {
      return fetch(`${options.baseUrl}/v1/invalidate`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }).then((response) => response.json());
    },
    warm(input: WarmRequest) {
      return fetch(`${options.baseUrl}/v1/warm`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }).then((response) => response.json());
    },
    getMetrics() {
      return fetch(`${options.baseUrl}/v1/metrics`, {
        headers,
      }).then((response) => response.json());
    },
  };
}
