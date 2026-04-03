import {
  type InvalidateRequest,
  type apiErrorCodeSchema,
  apiErrorSchema,
  invalidateRequestSchema,
  warmRequestSchema,
} from "@fengsoft/cache-core-contracts";
import { createCacheMetricSnapshot } from "@fengsoft/cache-core-metrics";
import { Elysia } from "elysia";
import { z } from "zod";

const invalidations: InvalidateRequest[] = [];
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3040),
  API_KEYS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    ),
});
const env = envSchema.parse(process.env);

function setRequestIdHeader(set: { headers?: unknown }, requestId: string) {
  const headers = set.headers as Record<string, string> | undefined;
  set.headers = {
    ...headers,
    "x-request-id": requestId,
  };
}

function resolveRequestId(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();
  return requestId && requestId.length > 0 ? requestId : crypto.randomUUID();
}

function resolveApiKey(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-api-key")?.trim() ?? "";
}

function createApiError(
  set: { status?: number | string; headers?: unknown },
  requestId: string,
  code: z.infer<typeof apiErrorCodeSchema>,
  message: string,
  details?: unknown,
) {
  setRequestIdHeader(set, requestId);
  return apiErrorSchema.parse({
    requestId,
    error: {
      code,
      message,
      details,
    },
  });
}

function createValidationError(
  set: { status?: number | string; headers?: unknown },
  requestId: string,
  error: z.ZodError,
) {
  set.status = 400;
  return createApiError(
    set,
    requestId,
    "invalid_request",
    "Invalid request",
    error.flatten(),
  );
}

function ensureAuthorized(
  request: Request,
  set: { status?: number | string; headers?: unknown },
  requestId: string,
) {
  if (env.API_KEYS.length === 0) {
    return null;
  }

  const token = resolveApiKey(request);

  if (env.API_KEYS.includes(token)) {
    return null;
  }

  set.status = 401;
  return createApiError(
    set,
    requestId,
    "unauthorized",
    "Missing or invalid API key.",
  );
}

const app = new Elysia()
  .get("/health", ({ request, set }) => {
    const requestId = resolveRequestId(request);
    setRequestIdHeader(set, requestId);
    return {
      ok: true,
      service: "cache-core-admin-api",
      uptimeSeconds: Math.round(process.uptime()),
    };
  })
  .get("/ready", ({ request, set }) => {
    const requestId = resolveRequestId(request);
    setRequestIdHeader(set, requestId);
    return {
      ok: true,
      service: "cache-core-admin-api",
      checks: {
        invalidationsBuffered: invalidations.length,
      },
    };
  })
  .group("/v1", (app) =>
    app
      .post("/invalidate", ({ body, request, set }) => {
        const requestId = resolveRequestId(request);
        const unauthorized = ensureAuthorized(request, set, requestId);

        if (unauthorized) {
          return unauthorized;
        }

        const parsed = invalidateRequestSchema.safeParse(body);

        if (!parsed.success) {
          return createValidationError(set, requestId, parsed.error);
        }

        invalidations.push(parsed.data);
        set.status = 202;
        setRequestIdHeader(set, requestId);
        return parsed.data;
      })
      .post("/warm", ({ body, request, set }) => {
        const requestId = resolveRequestId(request);
        const unauthorized = ensureAuthorized(request, set, requestId);

        if (unauthorized) {
          return unauthorized;
        }

        const parsed = warmRequestSchema.safeParse(body);

        if (!parsed.success) {
          return createValidationError(set, requestId, parsed.error);
        }

        set.status = 202;
        setRequestIdHeader(set, requestId);
        return {
          accepted: true,
          body: parsed.data,
        };
      })
      .get("/metrics", ({ request, set }) => {
        const requestId = resolveRequestId(request);
        const unauthorized = ensureAuthorized(request, set, requestId);

        if (unauthorized) {
          return unauthorized;
        }

        setRequestIdHeader(set, requestId);
        return createCacheMetricSnapshot({
          hits: 0,
          misses: 0,
          invalidations: invalidations.length,
        });
      }),
  );

if (import.meta.main) {
  app.listen(env.PORT);
  console.log("CacheCore admin API listening on port", env.PORT);
}
