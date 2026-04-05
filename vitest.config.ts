import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		alias: {
			"@saazip/cache-core": fileURLToPath(
				new URL("./packages/sdk/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-domain": fileURLToPath(
				new URL("./packages/core/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-contracts": fileURLToPath(
				new URL("./packages/contracts/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-metrics": fileURLToPath(
				new URL("./packages/metrics/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-observability": fileURLToPath(
				new URL("./packages/observability/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-testing": fileURLToPath(
				new URL("./packages/testing/src/index.ts", import.meta.url),
			),
			"@saazip/cache-core-adapter-redis": fileURLToPath(
				new URL("./packages/adapters/redis/src/index.ts", import.meta.url),
			),
		},
	},
});
