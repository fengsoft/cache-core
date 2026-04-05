import { createCacheCore } from "@saazip/cache-core";
import {
	buildCacheKey,
	canServeStaleEntry,
	createCacheEntry,
	createCachePolicy,
	normalizeTags,
	resolveCacheEntryState,
	shouldRefreshEntry,
} from "@saazip/cache-core-domain";
import { describe, expect, test } from "vitest";

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
			policy: createCachePolicy(300, 30),
		});

		expect(entry.tags).toEqual(["signup"]);
		expect(entry.expiresAt.length).toBeGreaterThan(0);
		expect(entry.staleUntil?.length).toBeGreaterThan(0);
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

	test("serves stale values while remember refreshes in background", async () => {
		const cache = createCacheCore({
			namespace: {
				service: "capta",
				domain: "analytics",
			},
		}).withTenant("tenant_1");

		await cache.set(
			["metrics", "stale"],
			{ count: 1 },
			{
				ttlSeconds: 0,
				staleWhileRevalidateSeconds: 60,
			},
		);

		const staleEntry = await cache.getWithMetadata<{ count: number }>([
			"metrics",
			"stale",
		]);

		expect(staleEntry.state).toBe("stale");

		const remembered = await cache.remember(
			["metrics", "stale"],
			async () => ({ count: 2 }),
			{
				ttlSeconds: 0,
				staleWhileRevalidateSeconds: 60,
			},
		);

		expect(remembered).toEqual({ count: 1 });

		await cache.waitForRefresh(["metrics", "stale"]);

		const refreshed = await cache.getWithMetadata<{ count: number }>([
			"metrics",
			"stale",
		]);

		expect(refreshed.value).toEqual({ count: 2 });
		expect(cache.getMetrics().remembers).toBeGreaterThan(0);
	});

	test("resolves stale cache entry state explicitly", () => {
		const now = new Date();
		const staleEntry = {
			expiresAt: new Date(now.getTime() - 1_000).toISOString(),
			staleUntil: new Date(now.getTime() + 60_000).toISOString(),
		};

		expect(shouldRefreshEntry(staleEntry.expiresAt)).toBe(true);
		expect(canServeStaleEntry(staleEntry)).toBe(true);
		expect(resolveCacheEntryState(staleEntry)).toBe("stale");
	});
});
