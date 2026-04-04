const packageDocs = {
	contracts: {
		description:
			"Public HTTP and cache-surface contracts for invalidation, warming, metrics, and admin API responses.",
		provides: [
			"validated admin API contracts",
			"a stable contract layer shared by the SDK and admin API",
		],
		useWhen: [
			"another service needs typed access to CacheCore admin surfaces",
			"you want invalidation and metrics contracts to stay explicit",
		],
		related: ["sdk", "core", "metrics"],
		sourceHints: ["src/index.ts"],
	},
	core: {
		description:
			"Key policy, namespacing, invalidation, stale-while-revalidate, and cache lifecycle primitives.",
		provides: [
			"the main cache lifecycle model",
			"tenant-aware namespacing and key construction",
			"invalidation and remember/get primitives",
		],
		useWhen: [
			"you want CacheCore embedded directly in another backend",
			"you need consistent cache semantics without hand-rolled wrappers",
		],
		related: ["contracts", "metrics", "adapters-redis", "sdk"],
		sourceHints: ["src/index.ts"],
	},
	metrics: {
		description:
			"Metric names and helpers for hit ratio, invalidation, and average load timing.",
		provides: [
			"shared metric primitives for the SDK and admin API",
			"a clear operational language around cache behavior",
		],
		useWhen: [
			"you want cache hits, misses, remembers, and invalidations tracked consistently",
		],
		related: ["core", "sdk", "admin-api"],
		sourceHints: ["src/index.ts"],
	},
	observability: {
		description:
			"Metrics, logging, and tracing helpers shared across the admin API and operational flows.",
		provides: [
			"Prometheus metric names and helpers",
			"request correlation and JSON logging",
			"optional OTLP tracing bootstrap",
		],
		useWhen: [
			"you want CacheCore telemetry to stay consistent across embedded and sidecar surfaces",
		],
		related: ["admin-api", "metrics"],
		sourceHints: ["src/index.ts"],
	},
	sdk: {
		description:
			"The public package published as `@fengsoft/cache-core` for embedded library-first adoption.",
		provides: [
			"the main embedded cache API",
			"remember/get/getWithMetadata primitives with stale-while-revalidate support",
			"re-exported contracts, domain, and metric helpers",
		],
		useWhen: [
			"caching should stay close to the consuming backend instead of becoming a remote service",
			"you want one stable package boundary for cache behavior",
		],
		related: ["contracts", "core", "metrics", "adapters-redis"],
		youStillOwn: [
			"which reads are cached, how keys are chosen, and when invalidation should happen",
			"your product-specific tag strategy and cache policy decisions",
		],
		sourceHints: ["src/index.ts"],
		sample: {
			title: "Smallest useful setup",
			language: "ts",
			code: [
				'import { createCacheCore } from "@fengsoft/cache-core";',
				"",
				"const cache = createCacheCore({",
				"  namespace: { service: 'billing-api', domain: 'plans' },",
				'  tenantId: "tenant_demo",',
				"});",
				"",
				"const value = await cache.remember(",
				"  ['catalog', 'current'],",
				"  async () => ({ plans: ['starter', 'pro'] }),",
				"  { tags: ['plans'], ttlSeconds: 60 },",
				");",
			],
		},
	},
	testing: {
		description: "Test helpers and fixtures for downstream CacheCore adoption.",
		provides: [
			"a dedicated place for cache fixtures and harnesses",
			"a reusable seam for product-level cache integration tests",
		],
		useWhen: ["your product wants to test CacheCore-backed flows consistently"],
		related: ["core", "sdk"],
		sourceHints: ["src/index.ts"],
	},
	"adapters-redis": {
		description:
			"Official Redis adapter for multi-instance, durable cache storage and tag coordination.",
		provides: [
			"Redis-backed storage for cache entries and tag invalidation support",
		],
		useWhen: [
			"you want CacheCore beyond in-memory usage and into shared Redis-backed environments",
		],
		related: ["core", "sdk"],
		sourceHints: ["src/index.ts"],
	},
};

const runtimeDocs = {
	"admin-api": {
		title: "@fengsoft/cache-core-admin-api",
		description:
			"Operational sidecar API for invalidation, warm requests, metrics, and cache admin workflows.",
		bestFor: [
			"teams who want an explicit operational surface around CacheCore behavior",
			"shared platforms that use the same cache conventions across services",
		],
		responsibilities: [
			"accept invalidation requests",
			"accept warm requests",
			"serve health, readiness, and metrics surfaces",
			"expose admin-friendly cache snapshots",
		],
		runCommand: "pnpm dev:admin-api",
		localSurface: "http://127.0.0.1:3040",
		routes: [
			"`GET /health`",
			"`GET /ready`",
			"`GET /metrics`",
			"`POST /v1/invalidate`",
			"`POST /v1/warm`",
			"`GET /v1/metrics`",
		],
		youStillOwn: [
			"your actual product cache policy and which operations are safe to expose internally",
		],
		sourceHints: ["src/index.ts"],
	},
};

const exampleDocs = {
	"http-cache": {
		title: "HTTP cache example",
		description:
			"Minimal embedded usage showing remember, stale reads, background refresh, invalidation, and metrics.",
		bestFor: [
			"teams who want to start with CacheCore as a library inside another backend",
		],
		demonstrates: [
			"read-through caching with remember",
			"stale-while-revalidate behavior",
			"tag invalidation and metrics inspection",
		],
		runCommand: "pnpm example:http-cache",
		tryThisFirst: {
			language: "bash",
			code: ["pnpm example:http-cache"],
		},
		expectedOutcome: [
			"the example warms a key, serves a stale read once, refreshes in the background, invalidates by tag, and prints metrics",
		],
		sourceHints: ["README.md", "index.ts"],
	},
	"fengsoft-suite-e2e": {
		title: "Fengsoft suite e2e example",
		description:
			"End-to-end example showing CacheCore composing with QueueFlow, EventFlow, and WebhookCore.",
		bestFor: [
			"teams who want to see CacheCore used as a read-side accelerator inside the wider Fengsoft stack",
		],
		demonstrates: [
			"composing cached read models with the rest of the Fengsoft runtime suite",
			"background refresh and admin API warming in a multi-service flow",
		],
		runCommand: "pnpm example:suite-e2e",
		tryThisFirst: {
			language: "bash",
			code: ["pnpm example:suite-e2e"],
		},
		expectedOutcome: [
			"the example builds a cached suite read model after QueueFlow, EventFlow, and WebhookCore complete their parts",
		],
		sourceHints: ["README.md", "index.ts"],
	},
};

export default {
	title: "CacheCore",
	description:
		"Reusable caching layer for SaaS backends with namespacing, tenant-aware keys, TTLs, tags, metrics, and an optional admin API.",
	defaultRepository: "fengsoft/cache-core",
	packagePrefix: "@fengsoft/cache-core",
	sidebar: {
		guides: [
			{ label: "Quick start", slug: "guides/getting-started" },
			{ label: "Architecture", slug: "guides/architecture" },
			{ label: "Adoption paths", slug: "guides/adoption-paths" },
			{ label: "Operate CacheCore", slug: "guides/operate-cache-core" },
			{ label: "Maturity and scope", slug: "guides/maturity-and-scope" },
		],
	},
	home: {
		intro:
			"CacheCore is a reusable caching layer for SaaS backends, with explicit namespacing, tenant-aware keys, invalidation, metrics, and an optional admin API.",
		whyAdopt: [
			"you want cache behavior explicit instead of scattered through app code",
			"you need predictable namespacing and tenant-aware keys",
			"you want stale-while-revalidate and invalidation as first-class behavior",
			"you want caching usable as an embedded library first, with an admin sidecar when needed",
		],
		whatQueueFlowOwns: [
			"cache lifecycle primitives like remember, invalidation, and metadata-aware reads",
			"the namespace and tag model for keeping keys predictable",
			"cache metrics primitives and the optional admin API surface",
			"official adapter seams like Redis for durable shared cache usage",
		],
		whatYourAppOwns: [
			"which reads should be cached and for how long",
			"your cache key, tag, and invalidation strategy at the product level",
			"which operational invalidation or warm-up flows you expose internally",
		],
		maturity: [
			"already useful as a library-first cache foundation",
			"best for backend teams who want explicit caching policy and metrics",
			"still opinionated toward backend caching, not generic storage abstraction",
		],
		howPiecesFit: [
			"your backend or service",
			"  -> @fengsoft/cache-core",
			"     -> contracts + core + metrics",
			"     -> adapters-redis for shared storage",
			"  -> cache-core admin api",
			"     -> invalidation, warm, and metrics operations",
		],
	},
	packageGroups: [
		{
			label: "Public adoption package",
			slugs: ["sdk"],
		},
		{
			label: "Embedded and operational packages",
			slugs: [
				"contracts",
				"core",
				"metrics",
				"observability",
				"testing",
				"adapters-redis",
			],
		},
	],
	packagesIndexIntro:
		"CacheCore is centered on one embedded public package, plus the packages that own policy, metrics, observability, and adapter concerns.",
	runtimesIndexIntro:
		"The admin API is optional. The default adoption path is still embedded library usage.",
	examplesIndexIntro:
		"The example folders show both the library-first path and the broader Fengsoft suite composition story.",
	packages: packageDocs,
	runtimes: runtimeDocs,
	examples: exampleDocs,
};
