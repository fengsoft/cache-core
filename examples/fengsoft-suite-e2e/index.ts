import { createCacheCore } from "@fengsoft/cache-core";

interface RequestOptions {
  method?: string;
  body?: unknown;
}

interface SuiteReadModel {
  tenantId: string;
  eventType: string;
  schemaId: string;
  eventId: string;
  jobId: string;
  deliveryId: string;
  deliveryStatus: string;
  attempts: number;
  eventMetricCount: number;
  queueTotal: number;
  refreshed?: boolean;
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed ${options.method ?? "GET"} ${path}: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data as T;
}

async function main() {
  const queueflowBaseUrl =
    process.env.QUEUEFLOW_BASE_URL ?? "http://127.0.0.1:3001";
  const eventflowBaseUrl =
    process.env.EVENTFLOW_BASE_URL ?? "http://127.0.0.1:3020";
  const webhookCoreBaseUrl =
    process.env.WEBHOOK_CORE_BASE_URL ?? "http://127.0.0.1:3030";
  const cacheCoreBaseUrl =
    process.env.CACHE_CORE_BASE_URL ?? "http://127.0.0.1:3040";
  const runId = Date.now().toString();
  const tenantId = `tenant_suite_${runId}`;
  const eventType = `lead.created.suite.${runId}`;

  const cache = createCacheCore({
    namespace: {
      service: "fengsoft-suite",
      domain: "dashboard",
    },
    tenantId,
  });

  const schema = await requestJson<{
    id: string;
    name: string;
    version: number;
  }>(eventflowBaseUrl, "/v1/schemas", {
    method: "POST",
    body: {
      name: eventType,
      version: 1,
      fields: ["leadId", "email", "source"],
    },
  });

  const endpointRegistration = await requestJson<{
    endpoint: { id: string; tenantId: string };
    secret: { version: number };
  }>(webhookCoreBaseUrl, "/v1/endpoints", {
    method: "POST",
    body: {
      tenantId,
      url: "https://example.com/webhooks/fengsoft-suite",
      eventTypes: [eventType],
    },
  });

  const trackedEvent = await requestJson<{
    id: string;
    tenantId: string;
    name: string;
    payload: Record<string, unknown>;
  }>(eventflowBaseUrl, "/v1/events", {
    method: "POST",
    body: {
      tenantId,
      name: eventType,
      version: 1,
      source: "suite-e2e",
      externalId: `lead:${runId}`,
      payload: {
        leadId: `lead_${runId}`,
        email: `buyer+${runId}@example.com`,
        source: "suite-e2e",
      },
    },
  });

  const queuedJob = await requestJson<{
    id: string;
    tenantId: string;
    queue: string;
    name: string;
    status: string;
  }>(queueflowBaseUrl, "/v1/jobs", {
    method: "POST",
    body: {
      tenantId,
      queue: "suite-e2e",
      name: "webhook.dispatch",
      payload: {
        eventId: trackedEvent.id,
        endpointId: endpointRegistration.endpoint.id,
        eventType,
      },
      idempotencyKey: `dispatch:${trackedEvent.id}`,
      maxAttempts: 3,
      backoffSeconds: 30,
    },
  });

  const delivery = await requestJson<{
    id: string;
    status: string;
    attempts: Array<{ outcome: string }>;
  }>(webhookCoreBaseUrl, "/v1/deliveries", {
    method: "POST",
    body: {
      endpointId: endpointRegistration.endpoint.id,
      tenantId,
      eventType,
      payload: trackedEvent.payload,
      maxAttempts: 3,
    },
  });

  const retriedDelivery = await requestJson<{
    id: string;
    status: string;
    nextAttemptAt?: string;
    attempts: Array<{ outcome: string; failureReason?: string }>;
  }>(webhookCoreBaseUrl, `/v1/deliveries/${delivery.id}/attempts`, {
    method: "POST",
    body: {
      statusCode: 503,
    },
  });

  const deliveredDelivery = await requestJson<{
    id: string;
    status: string;
    attempts: Array<{ outcome: string }>;
  }>(webhookCoreBaseUrl, `/v1/deliveries/${delivery.id}/attempts`, {
    method: "POST",
    body: {
      statusCode: 200,
    },
  });

  const eventMetrics = await requestJson<{
    items: Array<{ metric: string; count: number }>;
  }>(
    eventflowBaseUrl,
    `/v1/metrics?tenantId=${tenantId}&metric=${encodeURIComponent(`event.${eventType}`)}`,
  );

  const queueMetrics = await requestJson<{
    snapshot: { total: number; queues: Array<{ name: string; total: number }> };
  }>(queueflowBaseUrl, "/v1/queues/metrics");

  const readModel = await cache.remember<SuiteReadModel>(
    ["suite", "overview"],
    async () => ({
      tenantId,
      eventType,
      schemaId: schema.id,
      eventId: trackedEvent.id,
      jobId: queuedJob.id,
      deliveryId: deliveredDelivery.id,
      deliveryStatus: deliveredDelivery.status,
      attempts: deliveredDelivery.attempts.length,
      eventMetricCount: eventMetrics.items[0]?.count ?? 0,
      queueTotal: queueMetrics.snapshot.total,
    }),
    {
      tags: ["suite-e2e", tenantId, eventType],
      ttlSeconds: 0,
      staleWhileRevalidateSeconds: 60,
    },
  );

  const staleRead = await cache.remember<SuiteReadModel>(
    ["suite", "overview"],
    async () => ({
      ...readModel,
      refreshed: true,
    }),
    {
      tags: ["suite-e2e", tenantId, eventType],
      ttlSeconds: 0,
      staleWhileRevalidateSeconds: 60,
    },
  );

  await cache.waitForRefresh(["suite", "overview"]);

  const refreshedRead = await cache.getWithMetadata<SuiteReadModel>([
    "suite",
    "overview",
  ]);

  await requestJson(cacheCoreBaseUrl, "/v1/warm", {
    method: "POST",
    body: {
      namespace: "fengsoft-suite:dashboard",
      tenantId,
      keys: ["suite:overview"],
    },
  });

  const cacheAdminMetrics = await requestJson<{
    hits: number;
    misses: number;
    invalidations: number;
    remembers: number;
  }>(cacheCoreBaseUrl, "/v1/metrics");

  if (retriedDelivery.status !== "retrying") {
    throw new Error(
      `Expected retrying delivery, got ${retriedDelivery.status}`,
    );
  }

  if (deliveredDelivery.status !== "delivered") {
    throw new Error(
      `Expected delivered webhook, got ${deliveredDelivery.status}`,
    );
  }

  if ((eventMetrics.items[0]?.count ?? 0) !== 1) {
    throw new Error(
      `Expected event metric count 1, got ${eventMetrics.items[0]?.count ?? 0}`,
    );
  }

  if (JSON.stringify(staleRead) !== JSON.stringify(readModel)) {
    throw new Error(
      "Expected stale read to return the previous cached payload.",
    );
  }

  if (refreshedRead.state !== "stale" && refreshedRead.state !== "fresh") {
    throw new Error(`Unexpected refreshed cache state: ${refreshedRead.state}`);
  }

  if (!refreshedRead.value || refreshedRead.value.refreshed !== true) {
    throw new Error(
      "Expected background refresh to update the cached read model.",
    );
  }

  console.log("Suite e2e summary:", {
    tenantId,
    eventType,
    eventId: trackedEvent.id,
    jobId: queuedJob.id,
    deliveryId: deliveredDelivery.id,
    queueStatus: queuedJob.status,
    webhookStatus: deliveredDelivery.status,
    cachedState: refreshedRead.state,
    cacheMetrics: cache.getMetrics(),
    cacheAdminMetrics,
  });
}

main().catch((error) => {
  console.error("Fengsoft suite e2e example failed.");
  console.error(error);
  process.exitCode = 1;
});
