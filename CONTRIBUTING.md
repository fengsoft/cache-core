# Contributing

CacheCore is a reusable caching layer for SaaS backends. Contributions should
improve predictability, observability, and isolation without turning the
project into a magic auto-cache framework.

## Ground rules

- keep cache policies explicit
- preserve tenant-aware key isolation
- make invalidation observable
- treat Redis as the primary adapter in v1
- update docs with every cache behavior change

## Local development

```bash
cp .env.example .env
docker compose up -d redis
pnpm install
pnpm dev:admin-api
```

## Commit convention

Use Conventional Commits whenever possible.

Preferred format:

```txt
<type>(<scope>): <summary>
```

Examples:

- `feat(admin-api): add request id propagation for invalidation routes`
- `fix(redis): preserve tenant-aware namespace composition`
- `docs(guides): explain tag-based invalidation strategy`
- `test(core): cover cache policy TTL behavior`
- `chore(ci): run contract checks in docker`

Recommended types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

Notes:

- keep the summary imperative and specific
- use a scope when it helps, such as `admin-api`, `core`, `redis`, `contracts`, or `docs`
- keep `changeset` files as the source of release intent; commit messages do not replace versioning metadata
