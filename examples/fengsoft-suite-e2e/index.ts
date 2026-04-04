import { createServer } from "node:http";
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

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
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

async function poll<T>(
	resolver: () => Promise<T | null>,
	options: {
		timeoutMs?: number;
		intervalMs?: number;
		description: string;
	},
) {
	const timeoutMs = options.timeoutMs ?? 10_000;
	const intervalMs = options.intervalMs ?? 150;
	const startedAt = Date.now();

	for (;;) {
		const value = await resolver();

		if (value) {
			return value;
		}

		if (Date.now() - startedAt >= timeoutMs) {
			throw new Error(`Timed out waiting for ${options.description}`);
		}

		await sleep(intervalMs);
	}
}

function startWebhookReceiver(bindHost: string) {
	let receiverAttempts = 0;
	const server = createServer((_request, response) => {
		receiverAttempts += 1;
		response.statusCode = receiverAttempts === 1 ? 503 : 200;
		response.end("ok");
	});

	return new Promise<{
		port: number;
		stop: () => Promise<void>;
		getAttempts: () => number;
	}>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, bindHost, () => {
			server.off("error", reject);
			const address = server.address();

			if (!address || typeof address === "string") {
				reject(new Error("Receiver failed to bind to an ephemeral port."));
				return;
			}

			resolve({
				port: address.port,
				stop: () =>
					new Promise<void>((closeResolve, closeReject) => {
						server.close((error) => {
							if (error) {
								closeReject(error);
								return;
							}

							closeResolve();
						});
					}),
				getAttempts: () => receiverAttempts,
			});
		});
	});
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
	const webhookReceiverHost = process.env.WEBHOOK_RECEIVER_HOST ?? "127.0.0.1";
	const webhookReceiverBindHost =
		process.env.WEBHOOK_RECEIVER_BIND_HOST ?? "0.0.0.0";
	const runId = Date.now().toString();
	const tenantId = `tenant_suite_${runId}`;
	const eventType = `lead.created.suite.${runId}`;
	const receiver = await startWebhookReceiver(webhookReceiverBindHost);

	try {
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

		await requestJson<{
			endpoint: { id: string; tenantId: string };
			secret: { version: number };
		}>(webhookCoreBaseUrl, "/v1/endpoints", {
			method: "POST",
			body: {
				tenantId,
				url: `http://${webhookReceiverHost}:${receiver.port}/webhooks/fengsoft-suite`,
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

		const queuedJob = await poll(
			async () => {
				const jobs = await requestJson<{
					items: Array<{
						id: string;
						status: string;
						payload: Record<string, unknown>;
					}>;
				}>(
					queueflowBaseUrl,
					`/v1/jobs?limit=20&queue=webhooks&jobType=webhook.dispatch`,
				);

				const matchingJob = jobs.items.find(
					(job) => job.payload.sourceEventId === trackedEvent.id,
				);

				return matchingJob?.status === "completed" ? matchingJob : null;
			},
			{
				description: "queueflow webhook job",
			},
		);

		const deliveredDelivery = await poll(
			async () => {
				const deliveries = await requestJson<{
					items: Array<{
						id: string;
						status: string;
						attempts: Array<{ outcome: string }>;
					}>;
				}>(
					webhookCoreBaseUrl,
					`/v1/deliveries?tenantId=${tenantId}&eventType=${encodeURIComponent(eventType)}&limit=20`,
				);

				return (
					deliveries.items.find(
						(delivery) => delivery.status === "delivered",
					) ?? null
				);
			},
			{
				description: "delivered webhook",
				timeoutMs: 15_000,
			},
		);

		const eventMetrics = await poll(
			async () => {
				const metrics = await requestJson<{
					items: Array<{ metric: string; count: number }>;
				}>(
					eventflowBaseUrl,
					`/v1/metrics?tenantId=${tenantId}&metric=${encodeURIComponent(`event.${eventType}`)}`,
				);

				return (metrics.items[0]?.count ?? 0) > 0 ? metrics : null;
			},
			{
				description: "eventflow aggregated metric",
			},
		);

		const queueMetrics = await requestJson<{
			snapshot: { total: number };
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

		if (deliveredDelivery.status !== "delivered") {
			throw new Error(
				`Expected delivered webhook, got ${deliveredDelivery.status}`,
			);
		}

		if (receiver.getAttempts() !== 2) {
			throw new Error(
				`Expected two receiver attempts, got ${receiver.getAttempts()}`,
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
			throw new Error(
				`Unexpected refreshed cache state: ${refreshedRead.state}`,
			);
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
			receiverAttempts: receiver.getAttempts(),
			cachedState: refreshedRead.state,
			cacheMetrics: cache.getMetrics(),
			cacheAdminMetrics,
		});
	} finally {
		await receiver.stop();
	}
}

main().catch((error) => {
	console.error("Fengsoft suite e2e example failed.");
	console.error(error);
	process.exitCode = 1;
});
