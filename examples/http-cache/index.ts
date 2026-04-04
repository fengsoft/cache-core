import { createCacheCore } from "@fengsoft/cache-core";

const tenantId = process.env.CACHECORE_TENANT_ID ?? "tenant_demo";

const cache = createCacheCore({
  namespace: {
    service: "billing-api",
    domain: "plans",
  },
  tenantId,
});

async function main() {
  const first = await cache.remember(
    ["catalog", "current"],
    async () => ({
      plans: ["starter", "pro", "enterprise"],
      generatedAt: new Date().toISOString(),
    }),
    {
      tags: ["plans", "catalog"],
      ttlSeconds: 0,
      staleWhileRevalidateSeconds: 60,
    },
  );

  console.log("Warm read:", first);

  const second = await cache.getWithMetadata(["catalog", "current"]);
  console.log("Cached read:", second);

  const staleRead = await cache.remember(
    ["catalog", "current"],
    async () => ({
      plans: ["starter", "pro", "enterprise"],
      generatedAt: new Date().toISOString(),
      refreshed: true,
    }),
    {
      tags: ["plans", "catalog"],
      ttlSeconds: 0,
      staleWhileRevalidateSeconds: 60,
    },
  );
  console.log("Served while refreshing:", staleRead);

  await cache.waitForRefresh(["catalog", "current"]);

  const refreshed = await cache.getWithMetadata(["catalog", "current"]);
  console.log("Read after background refresh:", refreshed);

  const invalidation = await cache.invalidateTag("plans");
  console.log("Invalidation event:", invalidation);

  const afterInvalidation = await cache.get(["catalog", "current"]);
  console.log("Read after invalidation:", afterInvalidation);

  console.log("Metrics snapshot:", cache.getMetrics());
}

main().catch((error) => {
  console.error("CacheCore example failed.");
  console.error(error);
  process.exitCode = 1;
});
