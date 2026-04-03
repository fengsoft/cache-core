import type {
  InvalidateRequest,
  WarmRequest,
} from "@fengsoft/cache-core-contracts";

export * from "@fengsoft/cache-core-contracts";
export * from "@fengsoft/cache-core-domain";
export * from "@fengsoft/cache-core-metrics";

export interface CacheCoreClientOptions {
  baseUrl: string;
  apiKey?: string;
}

export function createCacheCoreClient(options: CacheCoreClientOptions) {
  const headers = {
    "content-type": "application/json",
    ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
  };

  return {
    invalidate(input: InvalidateRequest) {
      return fetch(`${options.baseUrl}/v1/invalidate`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }).then((response) => response.json());
    },
    warm(input: WarmRequest) {
      return fetch(`${options.baseUrl}/v1/warm`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      }).then((response) => response.json());
    },
    getMetrics() {
      return fetch(`${options.baseUrl}/v1/metrics`, {
        headers,
      }).then((response) => response.json());
    },
  };
}
