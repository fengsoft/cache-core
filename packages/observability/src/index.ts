export type MetricLabels = Record<
  string,
  string | number | boolean | undefined | null
>;

function normalizeMetricValue(value: MetricLabels[string]) {
  if (value === undefined || value === null) {
    return "unknown";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function normalizeLabels(labelNames: string[], labels: MetricLabels = {}) {
  return Object.fromEntries(
    labelNames.map((labelName) => [
      labelName,
      normalizeMetricValue(labels[labelName]),
    ]),
  );
}

function serializeLabels(labels: Record<string, string>) {
  const entries = Object.entries(labels);

  if (entries.length === 0) {
    return "";
  }

  return `{${entries
    .map(
      ([key, value]) =>
        `${key}="${value
          .replaceAll("\\", "\\\\")
          .replaceAll('"', '\\"')
          .replaceAll("\n", "\\n")}"`,
    )
    .join(",")}}`;
}

function sampleKey(labels: Record<string, string>) {
  return JSON.stringify(labels);
}

class CounterMetric {
  private readonly samples = new Map<
    string,
    { labels: Record<string, string>; value: number }
  >();

  constructor(
    private readonly name: string,
    private readonly help: string,
    private readonly labelNames: string[],
  ) {}

  inc(labels: MetricLabels = {}, value = 1) {
    const normalized = normalizeLabels(this.labelNames, labels);
    const key = sampleKey(normalized);
    const current = this.samples.get(key) ?? { labels: normalized, value: 0 };
    current.value += value;
    this.samples.set(key, current);
  }

  render() {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} counter`,
    ];

    if (this.samples.size === 0) {
      lines.push(`${this.name} 0`);
      return lines;
    }

    for (const sample of this.samples.values()) {
      lines.push(
        `${this.name}${serializeLabels(sample.labels)} ${sample.value}`,
      );
    }

    return lines;
  }
}

class GaugeMetric {
  private readonly samples = new Map<
    string,
    { labels: Record<string, string>; value: number }
  >();

  constructor(
    private readonly name: string,
    private readonly help: string,
    private readonly labelNames: string[],
  ) {}

  set(value: number, labels: MetricLabels = {}) {
    const normalized = normalizeLabels(this.labelNames, labels);
    this.samples.set(sampleKey(normalized), {
      labels: normalized,
      value,
    });
  }

  inc(labels: MetricLabels = {}, value = 1) {
    const normalized = normalizeLabels(this.labelNames, labels);
    const key = sampleKey(normalized);
    const current = this.samples.get(key) ?? { labels: normalized, value: 0 };
    current.value += value;
    this.samples.set(key, current);
  }

  render() {
    const lines = [
      `# HELP ${this.name} ${this.help}`,
      `# TYPE ${this.name} gauge`,
    ];

    if (this.samples.size === 0) {
      lines.push(`${this.name} 0`);
      return lines;
    }

    for (const sample of this.samples.values()) {
      lines.push(
        `${this.name}${serializeLabels(sample.labels)} ${sample.value}`,
      );
    }

    return lines;
  }
}

export class PrometheusRegistry {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly gauges = new Map<string, GaugeMetric>();

  counter(name: string, help: string, labelNames: string[] = []) {
    const existing = this.counters.get(name);

    if (existing) {
      return existing;
    }

    const metric = new CounterMetric(name, help, labelNames);
    this.counters.set(name, metric);
    return metric;
  }

  gauge(name: string, help: string, labelNames: string[] = []) {
    const existing = this.gauges.get(name);

    if (existing) {
      return existing;
    }

    const metric = new GaugeMetric(name, help, labelNames);
    this.gauges.set(name, metric);
    return metric;
  }

  render(extraLines: string[] = []) {
    return [
      ...Array.from(this.counters.values(), (metric) => metric.render()).flat(),
      ...Array.from(this.gauges.values(), (metric) => metric.render()).flat(),
      ...extraLines,
      "",
    ].join("\n");
  }
}

export const cacheCoreMetricNames = {
  httpRequestTotal: "cache_core_http_request_total",
  httpRequestDurationMsSum: "cache_core_http_request_duration_ms_sum",
  httpRequestDurationMsCount: "cache_core_http_request_duration_ms_count",
  invalidateRequestTotal: "cache_core_invalidate_request_total",
  warmRequestTotal: "cache_core_warm_request_total",
  cacheHitGauge: "cache_core_hit_total",
  cacheMissGauge: "cache_core_miss_total",
  cacheInvalidationGauge: "cache_core_invalidation_total",
  cacheAverageLoadMsGauge: "cache_core_average_load_ms",
} as const;

export interface CacheCoreHealthSnapshot {
  ok: boolean;
  invalidationsBuffered: number;
  warmRequests: number;
}

export interface Logger {
  info(event: string, fields?: MetricLabels): void;
  error(event: string, fields?: MetricLabels): void;
}

export function createJsonLogger(service: string): Logger {
  function log(
    level: "info" | "error",
    event: string,
    fields: MetricLabels = {},
  ) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      service,
      event,
      ...fields,
    };
    const serialized = JSON.stringify(payload);

    if (level === "error") {
      console.error(serialized);
      return;
    }

    console.log(serialized);
  }

  return {
    info(event, fields) {
      log("info", event, fields);
    },
    error(event, fields) {
      log("error", event, fields);
    },
  };
}

function parseTraceparent(value?: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i);

  if (!match) {
    return null;
  }

  return {
    traceId: match[1],
    parentSpanId: match[2],
  };
}

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function attributeValue(
  value: MetricLabels[string],
): Record<string, boolean | number | string> {
  if (typeof value === "boolean") {
    return { boolValue: value };
  }

  if (typeof value === "number") {
    return { doubleValue: value };
  }

  return { stringValue: normalizeMetricValue(value) };
}

function toSpanAttributes(attributes: MetricLabels = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      value: attributeValue(value),
    }));
}

function parseHeaderPairs(value?: string) {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...rest] = item.split("=");
        return [key.trim(), rest.join("=").trim()];
      }),
  );
}

export function resolveBooleanEnv(
  value: string | undefined,
  defaultValue: boolean,
) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function resolveStatusCode(
  status: number | string | undefined,
  defaultValue = 200,
) {
  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  return defaultValue;
}

export interface TracingConfig {
  enabled: boolean;
  otlpEndpoint?: string;
  otlpHeaders?: string;
}

export interface StartedSpan {
  traceId: string;
  spanId: string;
  traceparent: string;
  end(options?: {
    status?: "ok" | "error";
    attributes?: MetricLabels;
  }): void;
}

export function createTracer(
  service: string,
  config: TracingConfig,
  logger: Logger,
) {
  return {
    startSpan(
      name: string,
      options: {
        traceparent?: string | null;
        attributes?: MetricLabels;
      } = {},
    ): StartedSpan {
      const parent = parseTraceparent(options.traceparent);
      const traceId = parent?.traceId ?? randomHex(16);
      const spanId = randomHex(8);
      const traceparent = `00-${traceId}-${spanId}-01`;
      const startTimeUnixNano = `${Date.now() * 1_000_000}`;

      return {
        traceId,
        spanId,
        traceparent,
        end: ({ status = "ok", attributes = {} } = {}) => {
          if (!config.enabled || !config.otlpEndpoint) {
            return;
          }

          const headers = {
            "content-type": "application/json",
            ...parseHeaderPairs(config.otlpHeaders),
          };
          const endTimeUnixNano = `${Date.now() * 1_000_000}`;
          const body = {
            resourceSpans: [
              {
                resource: {
                  attributes: [
                    {
                      key: "service.name",
                      value: { stringValue: service },
                    },
                  ],
                },
                scopeSpans: [
                  {
                    scope: {
                      name: `${service}.manual`,
                    },
                    spans: [
                      {
                        traceId,
                        spanId,
                        parentSpanId: parent?.parentSpanId,
                        name,
                        kind: 1,
                        startTimeUnixNano,
                        endTimeUnixNano,
                        attributes: toSpanAttributes({
                          ...options.attributes,
                          ...attributes,
                        }),
                        status: status === "error" ? { code: 2 } : { code: 1 },
                      },
                    ],
                  },
                ],
              },
            ],
          };

          void fetch(config.otlpEndpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          }).catch((error: unknown) => {
            logger.error("trace_export_failed", {
              traceId,
              message: error instanceof Error ? error.message : String(error),
            });
          });
        },
      };
    },
  };
}
