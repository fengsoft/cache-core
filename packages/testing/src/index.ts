import type { InvalidateRequest } from "@saazip/cache-core-contracts";

export function createInvalidationFixture(
	overrides: Partial<InvalidateRequest> = {},
): InvalidateRequest {
	return {
		namespace: "analytics:metrics",
		tenantId: "tenant_test",
		tag: "metric:signup",
		...overrides,
	};
}
