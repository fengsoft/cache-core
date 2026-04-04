import type {
  InvalidateRequest,
  WarmRequest,
} from "@fengsoft/cache-core-contracts";
import {
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
  shouldRefreshEntry,
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

  async function getValue<T>(key: KeyLike, writeOptions?: CacheWriteOptions) {
    const cacheKey = resolveKey(key, writeOptions);
    const current = await store.get(cacheKey);

    if (!current) {
      metrics.recordMiss();
      return null;
    }

    const parsed = JSON.parse(current) as ReturnType<
      typeof createCacheEntry<string>
    >;

    if (shouldRefreshEntry(parsed.expiresAt)) {
      await store.del(cacheKey);
      await tagStore.removeKey?.(cacheKey);
      metrics.recordMiss();
      return null;
    }

    metrics.recordHit();
    return serializer.deserialize<T>(parsed.value);
  }

  async function setValue<T>(
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

    await store.set(cacheKey, JSON.stringify(entry), policy.ttlSeconds);

    for (const tag of entry.tags) {
      await tagStore.add(tag, cacheKey);
    }

    metrics.recordSet();
    return entry;
  }

  return {
    get: getValue,
    set: setValue,
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
      const existing = await getValue<T>(key, writeOptions);

      if (existing !== null) {
        return existing;
      }

      const startedAt = performance.now();
      const value = await loader();
      await setValue(key, value, writeOptions);
      metrics.recordRemember(
        Math.round((performance.now() - startedAt) * 100) / 100,
      );
      return value;
    },
    async invalidateKey(key: KeyLike, writeOptions?: CacheWriteOptions) {
      const cacheKey = resolveKey(key, writeOptions);
      await store.del(cacheKey);
      await tagStore.removeKey?.(cacheKey);
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
