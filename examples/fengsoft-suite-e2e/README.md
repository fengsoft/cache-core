# Fengsoft suite e2e example

This example composes the four Fengsoft infra projects in one automatic flow:

1. `EventFlow` registers a schema and ingests an event
2. `EventFlow` auto-enqueues a `webhook.dispatch` job in `QueueFlow`
3. `QueueFlow` worker fans out the event into `WebhookCore`
4. `WebhookCore` dispatches the delivery, retries once, and then succeeds
5. `CacheCore` builds and refreshes a cached read model for the composed result

The example assumes this runtime wiring:

- `eventflow` with `QUEUEFLOW_BASE_URL`
- `queueflow-api` and `queueflow-worker` sharing the same Postgres `DATABASE_URL`
- `queueflow-worker` with `WEBHOOK_CORE_BASE_URL`
- `webhook-core` able to reach the local receiver URL
- `cache-core/admin-api` running for warm and metrics endpoints

## Recommended topology

For a real end-to-end run, prefer:

1. Put Postgres, `queueflow`, `eventflow`, `webhook-core`, and `cache-core` on the same Docker network.
2. Expose the service ports consumed by the example.
3. Run the example on that same network, or expose its receiver with:
   - `WEBHOOK_RECEIVER_HOST`
   - `WEBHOOK_RECEIVER_BIND_HOST`

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
- `WEBHOOK_RECEIVER_HOST`
- `WEBHOOK_RECEIVER_BIND_HOST`
