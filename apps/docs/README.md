# @fengsoft/docs

This workspace contains the public CacheCore documentation site.

It uses `Astro + Starlight` and a small sync script to generate reference pages
from the repository workspace metadata.

Useful commands:

```bash
bun run --cwd apps/docs dev
bun run --cwd apps/docs typecheck
bun run --cwd apps/docs build
```
