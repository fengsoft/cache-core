import { describe, expect, test } from "bun:test";
import { createCacheCore } from "@fengsoft/cache-core";
import {
  buildCacheKey,
  createCacheEntry,
  createCachePolicy,
  normalizeTags,
  shouldRefreshEntry,
} from "@fengsoft/cache-core-domain";

describe("cache-core", () => {
  test("builds a deterministic key", () => {
    expect(
      buildCacheKey({ service: "capta", domain: "analytics" }, "tenant_1", [
        "metrics",
        "signup",
      ]),
    ).toBe("capta:analytics:tenant_1:metrics:signup");
  });

  test("normalizes tags", () => {
    expect(normalizeTags(["b", "a", "a"])).toEqual(["a", "b"]);
  });

  test("refreshes expired entries", () => {
    expect(shouldRefreshEntry(new Date(0).toISOString())).toBe(true);
  });

  test("creates entries with ttl policy metadata", () => {
    const entry = createCacheEntry({
      key: "capta:analytics:tenant_1:metrics",
      value: "serialized",
      tags: ["signup"],
      policy: createCachePolicy(300),
    });

    expect(entry.tags).toEqual(["signup"]);
    expect(entry.expiresAt.length).toBeGreaterThan(0);
  });

  test("supports local cache get/set/remember and invalidation by tag", async () => {
    const cache = createCacheCore({
      namespace: {
        service: "capta",
        domain: "analytics",
      },
    }).withTenant("tenant_1");

    await cache.set(["metrics", "signup"], { count: 1 }, { tags: ["signup"] });
    expect(await cache.get<{ count: number }>(["metrics", "signup"])).toEqual({
      count: 1,
    });

    await cache.remember(["metrics", "signup"], async () => ({ count: 2 }));
    await cache.invalidateTag("signup");

    expect(await cache.get(["metrics", "signup"])).toBeNull();
    expect(cache.getMetrics().invalidations).toBeGreaterThan(0);
  });
});
