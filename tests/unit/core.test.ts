import { describe, expect, test } from "bun:test";
import {
  buildCacheKey,
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
});
