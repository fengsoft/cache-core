import { describe, expect, test } from "bun:test";
import {
  apiErrorSchema,
  invalidateRequestSchema,
  warmRequestSchema,
} from "@fengsoft/cache-core-contracts";
import { createInvalidationFixture } from "@fengsoft/cache-core-testing";

describe("cache-core contracts", () => {
  test("creates a valid invalidation fixture", () => {
    expect(createInvalidationFixture().tag).toBe("metric:signup");
  });

  test("rejects invalid invalidation payloads", () => {
    const parsed = invalidateRequestSchema.safeParse({
      namespace: "analytics:metrics",
    });

    expect(parsed.success).toBe(false);
  });

  test("rejects empty warm requests", () => {
    const parsed = warmRequestSchema.safeParse({
      namespace: "analytics:metrics",
      keys: [],
    });

    expect(parsed.success).toBe(false);
  });

  test("accepts standard api error envelopes", () => {
    const parsed = apiErrorSchema.safeParse({
      requestId: "req_123",
      error: {
        code: "unauthorized",
        message: "Missing or invalid API key.",
      },
    });

    expect(parsed.success).toBe(true);
  });
});
