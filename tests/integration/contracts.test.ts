import {
	apiErrorSchema,
	cacheMetricSnapshotSchema,
	invalidationEventSchema,
} from "@saazip/cache-core-contracts";
import { createInvalidationFixture } from "@saazip/cache-core-testing";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, test } from "vitest";
import { createCacheCoreAdminApi } from "../../apps/admin-api/src/index";

const apps: FastifyInstance[] = [];

afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("cache-core admin api", () => {
	test("accepts invalidation and warm requests", async () => {
		const app = createCacheCoreAdminApi({
			env: {
				PORT: "3040",
				API_KEYS: "secret",
				NODE_ENV: "test",
			},
		});
		apps.push(app);

		const invalidate = await app.inject({
			method: "POST",
			url: "/v1/invalidate",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			payload: createInvalidationFixture(),
		});
		const warm = await app.inject({
			method: "POST",
			url: "/v1/warm",
			headers: {
				authorization: "Bearer secret",
				"content-type": "application/json",
			},
			payload: {
				namespace: "analytics:metrics",
				tenantId: "tenant_test",
				keys: ["metric:signup"],
			},
		});

		expect(invalidate.statusCode).toBe(202);
		expect(invalidationEventSchema.parse(invalidate.json()).kind).toBe("tag");
		expect(warm.statusCode).toBe(202);
	});

	test("returns JSON metrics and Prometheus metrics", async () => {
		const app = createCacheCoreAdminApi({
			env: {
				PORT: "3040",
				NODE_ENV: "development",
			},
		});
		apps.push(app);

		await app.inject({
			method: "POST",
			url: "/v1/invalidate",
			headers: {
				"content-type": "application/json",
			},
			payload: createInvalidationFixture(),
		});

		const jsonMetrics = await app.inject({
			method: "GET",
			url: "/v1/metrics",
		});
		const prometheus = await app.inject({
			method: "GET",
			url: "/metrics",
		});

		expect(
			cacheMetricSnapshotSchema.parse(jsonMetrics.json()).invalidations,
		).toBe(1);
		expect(prometheus.body).toContain("cache_core_http_request_total");
	});

	test("rejects unauthorized requests when api keys are configured", async () => {
		const app = createCacheCoreAdminApi({
			env: {
				PORT: "3040",
				API_KEYS: "secret",
				NODE_ENV: "test",
			},
		});
		apps.push(app);

		const response = await app.inject({
			method: "POST",
			url: "/v1/invalidate",
		});

		expect(apiErrorSchema.parse(response.json()).error.code).toBe(
			"unauthorized",
		);
	});
});
