# Fengsoft suite e2e example

This example composes the four Fengsoft infra projects in one flow:

1. `EventFlow` registers a schema and ingests an event
2. `QueueFlow` records the async dispatch job
3. `WebhookCore` creates the outbound delivery, retries once, and then succeeds
4. `CacheCore` builds and refreshes a cached read model for the composed result

## Run

Start the local services first:

```bash
bun run dev:api      # queueflow
bun run dev:api      # eventflow
bun run dev:api      # webhook-core
bun run dev:admin-api # cache-core
```

Then run:

```bash
bun run example:suite-e2e
```

Optional environment variables:

- `QUEUEFLOW_BASE_URL`
- `EVENTFLOW_BASE_URL`
- `WEBHOOK_CORE_BASE_URL`
- `CACHE_CORE_BASE_URL`
