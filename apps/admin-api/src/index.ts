import {
  type InvalidateRequest,
  type apiErrorCodeSchema,
  apiErrorSchema,
  cacheMetricSnapshotSchema,
  healthResponseSchema,
  invalidateRequestSchema,
  readinessResponseSchema,
  warmRequestSchema,
} from "@fengsoft/cache-core-contracts";
import { createInvalidationEvent } from "@fengsoft/cache-core-domain";
import {
  createCacheMetricSnapshot,
  createCacheMetricsRecorder,
} from "@fengsoft/cache-core-metrics";
import {
  PrometheusRegistry,
  cacheCoreMetricNames,
  createJsonLogger,
  createTracer,
  resolveBooleanEnv,
  resolveStatusCode,
} from "@fengsoft/cache-core-observability";
import { Elysia } from "elysia";
import { z } from "zod";

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
  NODE_ENV: z.string().default("development"),
  SERVICE_NAME: z.string().default("cache-core-admin-api"),
  METRICS_PUBLIC: z
    .string()
    .optional()
    .transform((value) => resolveBooleanEnv(value, true)),
  OTEL_ENABLED: z
    .string()
    .optional()
    .transform((value) => resolveBooleanEnv(value, false)),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
});

interface RequestContext {
  route: string;
  method: string;
  requestId: string;
  startedAt: number;
  span: ReturnType<ReturnType<typeof createTracer>["startSpan"]>;
}

export function createCacheCoreAdminApi(
  input: {
    env?: Record<string, string | undefined>;
  } = {},
) {
  const env = envSchema.parse(input.env ?? process.env);
  const metricsPublic = env.NODE_ENV !== "production" && env.METRICS_PUBLIC;
  const invalidations: InvalidateRequest[] = [];
  const warmRequests: Array<{ namespace: string; keys: string[] }> = [];
  const invalidationEvents = new Map<
    string,
    ReturnType<typeof createInvalidationEvent>
  >();
  const logger = createJsonLogger(env.SERVICE_NAME);
  const tracer = createTracer(
    env.SERVICE_NAME,
    {
      enabled: env.OTEL_ENABLED,
      otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      otlpHeaders: env.OTEL_EXPORTER_OTLP_HEADERS,
    },
    logger,
  );
  const registry = new PrometheusRegistry();
  const requestCounter = registry.counter(
    cacheCoreMetricNames.httpRequestTotal,
    "Total HTTP requests handled by CacheCore admin API.",
    ["route", "method", "status_code"],
  );
  const requestDurationSum = registry.counter(
    cacheCoreMetricNames.httpRequestDurationMsSum,
    "Total request duration observed by CacheCore admin API in milliseconds.",
    ["route", "method", "status_code"],
  );
  const requestDurationCount = registry.counter(
    cacheCoreMetricNames.httpRequestDurationMsCount,
    "HTTP request observations recorded by CacheCore admin API.",
    ["route", "method", "status_code"],
  );
  const invalidateCounter = registry.counter(
    cacheCoreMetricNames.invalidateRequestTotal,
    "Invalidation requests accepted by CacheCore.",
    ["kind"],
  );
  const warmCounter = registry.counter(
    cacheCoreMetricNames.warmRequestTotal,
    "Warm requests accepted by CacheCore.",
    ["namespace"],
  );
  const hitGauge = registry.gauge(
    cacheCoreMetricNames.cacheHitGauge,
    "Cache hits observed by CacheCore.",
  );
  const missGauge = registry.gauge(
    cacheCoreMetricNames.cacheMissGauge,
    "Cache misses observed by CacheCore.",
  );
  const invalidationGauge = registry.gauge(
    cacheCoreMetricNames.cacheInvalidationGauge,
    "Cache invalidations observed by CacheCore.",
  );
  const averageLoadMsGauge = registry.gauge(
    cacheCoreMetricNames.cacheAverageLoadMsGauge,
    "Average remember/load duration observed by CacheCore.",
  );
  const cacheMetrics = createCacheMetricsRecorder();

  function setHeader(
    set: { headers?: unknown },
    headerName: string,
    headerValue: string,
  ) {
    const headers = (set.headers ?? {}) as Record<string, string>;
    headers[headerName] = headerValue;
    set.headers = headers;
  }

  function setRequestIdHeader(set: { headers?: unknown }, requestId: string) {
    setHeader(set, "x-request-id", requestId);
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
    requestId: string,
    code: z.infer<typeof apiErrorCodeSchema>,
    message: string,
    details?: unknown,
  ) {
    return apiErrorSchema.parse({
      requestId,
      error: {
        code,
        message,
        details,
      },
    });
  }

  function beginRequest(
    route: string,
    request: Request,
    set: { headers?: unknown },
  ): RequestContext {
    const requestId = resolveRequestId(request);
    const span = tracer.startSpan(`http ${request.method} ${route}`, {
      traceparent: request.headers.get("traceparent"),
      attributes: {
        route,
        method: request.method,
        requestId,
      },
    });
    setRequestIdHeader(set, requestId);
    setHeader(set, "traceparent", span.traceparent);

    return {
      route,
      method: request.method,
      requestId,
      startedAt: performance.now(),
      span,
    };
  }

  function finalizeRequest(
    context: RequestContext,
    set: { status?: number | string; headers?: unknown },
    details: Record<string, unknown> = {},
  ) {
    const statusCode = resolveStatusCode(set.status);
    const durationMs =
      Math.round((performance.now() - context.startedAt) * 100) / 100;
    const labels = {
      route: context.route,
      method: context.method,
      status_code: statusCode,
    };

    requestCounter.inc(labels);
    requestDurationSum.inc(labels, durationMs);
    requestDurationCount.inc(labels);

    logger.info("http_request", {
      requestId: context.requestId,
      route: context.route,
      method: context.method,
      statusCode,
      durationMs,
      ...details,
    });

    context.span.end({
      status: statusCode >= 500 ? "error" : "ok",
      attributes: {
        statusCode,
        durationMs,
        ...details,
      },
    });
  }

  function respondError(
    context: RequestContext,
    set: { status?: number | string; headers?: unknown },
    code: z.infer<typeof apiErrorCodeSchema>,
    message: string,
    details?: unknown,
  ) {
    const body = createApiError(context.requestId, code, message, details);
    setRequestIdHeader(set, context.requestId);
    finalizeRequest(context, set, {
      errorCode: code,
    });
    return body;
  }

  function ensureAuthorized(
    context: RequestContext,
    request: Request,
    set: { status?: number | string; headers?: unknown },
  ) {
    if (env.API_KEYS.length === 0) {
      return null;
    }

    const token = resolveApiKey(request);

    if (env.API_KEYS.includes(token)) {
      return null;
    }

    set.status = 401;
    return respondError(
      context,
      set,
      "unauthorized",
      "Missing or invalid API key.",
    );
  }

  function ensureMetricsAccessible(
    context: RequestContext,
    request: Request,
    set: { status?: number | string; headers?: unknown },
  ) {
    if (metricsPublic) {
      return null;
    }

    return ensureAuthorized(context, request, set);
  }

  function snapshotMetrics() {
    const snapshot = cacheMetrics.snapshot();
    hitGauge.set(snapshot.hits);
    missGauge.set(snapshot.misses);
    invalidationGauge.set(snapshot.invalidations);
    averageLoadMsGauge.set(snapshot.averageLoadMs);
    return cacheMetricSnapshotSchema.parse(createCacheMetricSnapshot(snapshot));
  }

  function renderPrometheusMetrics() {
    snapshotMetrics();
    return registry.render();
  }

  return new Elysia()
    .get("/health", ({ request, set }) => {
      const context = beginRequest("/health", request, set);
      const body = healthResponseSchema.parse({
        ok: true,
        service: env.SERVICE_NAME,
        uptimeSeconds: Math.round(process.uptime()),
      });
      finalizeRequest(context, set);
      return body;
    })
    .get("/ready", ({ request, set }) => {
      const context = beginRequest("/ready", request, set);
      const body = readinessResponseSchema.parse({
        ok: true,
        service: env.SERVICE_NAME,
        checks: {
          invalidationsBuffered: invalidations.length,
          warmRequests: warmRequests.length,
        },
      });
      finalizeRequest(context, set, {
        invalidationsBuffered: invalidations.length,
        warmRequests: warmRequests.length,
      });
      return body;
    })
    .get("/metrics", ({ request, set }) => {
      const context = beginRequest("/metrics", request, set);
      const unauthorized = ensureMetricsAccessible(context, request, set);

      if (unauthorized) {
        return unauthorized;
      }

      setHeader(
        set,
        "content-type",
        "text/plain; version=0.0.4; charset=utf-8",
      );
      const body = renderPrometheusMetrics();
      finalizeRequest(context, set);
      return body;
    })
    .group("/v1", (app) =>
      app
        .post("/invalidate", ({ body, request, set }) => {
          const context = beginRequest("/v1/invalidate", request, set);
          const unauthorized = ensureAuthorized(context, request, set);

          if (unauthorized) {
            return unauthorized;
          }

          const parsed = invalidateRequestSchema.safeParse(body);

          if (!parsed.success) {
            set.status = 400;
            return respondError(
              context,
              set,
              "invalid_request",
              "Invalid request",
              parsed.error.flatten(),
            );
          }

          invalidations.push(parsed.data);
          const event = createInvalidationEvent({
            namespace: parsed.data.namespace,
            tenantId: parsed.data.tenantId,
            kind: parsed.data.key ? "key" : "tag",
            target: parsed.data.key ?? parsed.data.tag ?? "unknown",
          });

          invalidationEvents.set(event.id, event);
          invalidateCounter.inc({
            kind: event.kind,
          });
          cacheMetrics.recordInvalidation();

          set.status = 202;
          finalizeRequest(context, set, {
            namespace: parsed.data.namespace,
            invalidationId: event.id,
            tenantId: parsed.data.tenantId,
          });
          return event;
        })
        .post("/warm", ({ body, request, set }) => {
          const context = beginRequest("/v1/warm", request, set);
          const unauthorized = ensureAuthorized(context, request, set);

          if (unauthorized) {
            return unauthorized;
          }

          const parsed = warmRequestSchema.safeParse(body);

          if (!parsed.success) {
            set.status = 400;
            return respondError(
              context,
              set,
              "invalid_request",
              "Invalid request",
              parsed.error.flatten(),
            );
          }

          warmRequests.push({
            namespace: parsed.data.namespace,
            keys: parsed.data.keys,
          });
          warmCounter.inc({
            namespace: parsed.data.namespace,
          });
          cacheMetrics.recordRemember(parsed.data.keys.length * 5);

          set.status = 202;
          finalizeRequest(context, set, {
            namespace: parsed.data.namespace,
            keyCount: parsed.data.keys.length,
          });
          return {
            accepted: true,
            body: parsed.data,
          };
        })
        .get("/metrics", ({ request, set }) => {
          const context = beginRequest("/v1/metrics", request, set);
          const unauthorized = ensureAuthorized(context, request, set);

          if (unauthorized) {
            return unauthorized;
          }

          const snapshot = snapshotMetrics();

          finalizeRequest(context, set, snapshot);
          return snapshot;
        }),
    );
}

if (import.meta.main) {
  const env = envSchema.parse(process.env);
  const logger = createJsonLogger(env.SERVICE_NAME);
  const app = createCacheCoreAdminApi({ env: process.env });

  app.listen(env.PORT);
  logger.info("service_boot", {
    port: env.PORT,
    metricsPublic: env.NODE_ENV !== "production" && env.METRICS_PUBLIC,
    tracingEnabled: env.OTEL_ENABLED,
  });
}
