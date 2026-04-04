import { describe, expect, test } from "bun:test";
import {
  apiErrorSchema,
  cacheMetricSnapshotSchema,
  invalidationEventSchema,
} from "@fengsoft/cache-core-contracts";
import { createInvalidationFixture } from "@fengsoft/cache-core-testing";
import { createCacheCoreAdminApi } from "../../apps/admin-api/src/index";

describe("cache-core admin api", () => {
  test("accepts invalidation and warm requests", async () => {
    const app = createCacheCoreAdminApi({
      env: {
        PORT: "3040",
        API_KEYS: "secret",
        NODE_ENV: "test",
      },
    });

    const invalidate = await app.handle(
      new Request("http://cache-core.local/v1/invalidate", {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify(createInvalidationFixture()),
      }),
    );
    const warm = await app.handle(
      new Request("http://cache-core.local/v1/warm", {
        method: "POST",
        headers: {
          authorization: "Bearer secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          namespace: "analytics:metrics",
          tenantId: "tenant_test",
          keys: ["metric:signup"],
        }),
      }),
    );

    expect(invalidate.status).toBe(202);
    expect(invalidationEventSchema.parse(await invalidate.json()).kind).toBe(
      "tag",
    );
    expect(warm.status).toBe(202);
  });

  test("returns JSON metrics and Prometheus metrics", async () => {
    const app = createCacheCoreAdminApi({
      env: {
        PORT: "3040",
        NODE_ENV: "development",
      },
    });

    await app.handle(
      new Request("http://cache-core.local/v1/invalidate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(createInvalidationFixture()),
      }),
    );

    const jsonMetrics = await app.handle(
      new Request("http://cache-core.local/v1/metrics"),
    );
    const prometheus = await app.handle(
      new Request("http://cache-core.local/metrics"),
    );

    expect(
      cacheMetricSnapshotSchema.parse(await jsonMetrics.json()).invalidations,
    ).toBe(1);
    expect(await prometheus.text()).toContain("cache_core_http_request_total");
  });

  test("rejects unauthorized requests when api keys are configured", async () => {
    const app = createCacheCoreAdminApi({
      env: {
        PORT: "3040",
        API_KEYS: "secret",
        NODE_ENV: "test",
      },
    });

    const response = await app.handle(
      new Request("http://cache-core.local/v1/invalidate", {
        method: "POST",
      }),
    );

    expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
      "unauthorized",
    );
  });
});
