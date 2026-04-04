import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  apiErrorSchema,
  cacheMetricSnapshotSchema,
  healthResponseSchema,
  invalidateRequestSchema,
  invalidationEventSchema,
  readinessResponseSchema,
  warmRequestSchema,
} from "@fengsoft/cache-core-contracts";
import YAML from "yaml";
import { zodToJsonSchema } from "zod-to-json-schema";

function jsonSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
  const value = zodToJsonSchema(schema, {
    target: "openApi3",
    $refStrategy: "none",
  }) as Record<string, unknown>;
  value.$schema = undefined;
  return value;
}

const document = {
  openapi: "3.1.0",
  info: {
    title: "CacheCore Admin API",
    version: "0.1.0",
    description: "Operational API for invalidation, warming and cache metrics.",
  },
  servers: [{ url: "http://localhost:3040" }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "http", scheme: "bearer" },
    },
    schemas: {
      HealthResponse: jsonSchema(healthResponseSchema),
      ReadinessResponse: jsonSchema(readinessResponseSchema),
      InvalidateRequest: jsonSchema(invalidateRequestSchema),
      InvalidationEvent: jsonSchema(invalidationEventSchema),
      WarmRequest: jsonSchema(warmRequestSchema),
      CacheMetricSnapshot: jsonSchema(cacheMetricSnapshotSchema),
      ApiError: jsonSchema(apiErrorSchema),
    },
  },
  paths: {
    "/health": {
      get: {
        responses: {
          "200": {
            description: "Liveness",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/ready": {
      get: {
        responses: {
          "200": {
            description: "Readiness",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadinessResponse" },
              },
            },
          },
        },
      },
    },
    "/metrics": {
      get: {
        responses: {
          "200": {
            description: "Prometheus metrics",
            content: { "text/plain": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/v1/invalidate": {
      post: {
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InvalidateRequest" },
            },
          },
        },
        responses: {
          "202": {
            description: "Invalidation accepted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InvalidationEvent" },
              },
            },
          },
        },
      },
    },
    "/v1/warm": {
      post: {
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WarmRequest" },
            },
          },
        },
        responses: { "202": { description: "Warm request accepted" } },
      },
    },
    "/v1/metrics": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        responses: {
          "200": {
            description: "Cache metrics snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CacheMetricSnapshot" },
              },
            },
          },
        },
      },
    },
  },
};

const outputFile = new URL("../docs/reference/openapi.yaml", import.meta.url);
const outputYaml = YAML.stringify(document);

if (process.argv.includes("--check")) {
  const existing = existsSync(outputFile)
    ? await Bun.file(outputFile).text()
    : "";

  if (existing !== outputYaml) {
    console.error(
      "OpenAPI output is stale. Run `bun run generate:openapi` and commit the result.",
    );
    process.exit(1);
  }
} else {
  mkdirSync(dirname(outputFile.pathname), { recursive: true });
  await Bun.write(outputFile, outputYaml);
}
