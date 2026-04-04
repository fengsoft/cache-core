# Release checklist

Before the first public release, confirm:

- `pnpm run ci` passes locally and in GitHub Actions
- `docs/reference/openapi.yaml` is generated from the current Zod contracts
- npm package manifests still match the intended public surface
- `examples/http-cache/index.ts` still works from a fresh install
- invalidation, TTL and namespace behavior remain covered by tests
- `/health`, `/ready` and `/metrics` are documented and reachable
- `NPM_TOKEN` is configured only in GitHub Actions secrets, never in the repo

CacheCore is library-first in this phase, so release hygiene includes npm publishing through GitHub Actions.
