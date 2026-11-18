# ops-console

Example operations console built on Sheen. It is a SolidStart SSR app that serves deterministic synthetic data (seeded PRNG) from its own API routes, with added latency.

## Run

```sh
pnpm install            # from the repo root; links workspace packages
pnpm --filter ops-console dev        # http://127.0.0.1:4310
pnpm --filter ops-console build
pnpm --filter ops-console typecheck
pnpm --filter ops-console lint
```

Smoke tests: `pnpm exec playwright test --config tests/examples/playwright.config.ts --project ops-console`.

## What it exercises

- `AdminApp` chrome: sidebar navigation, command palette, toaster, theme/accent/mode switching. Dark is the default.
- Overview (`/`): `StatGroup` and a streaming `TimeSeries`. Collector outages render as NaN gaps rather than zeros.
- Accounts (`/accounts`): `DataTablePage` with numbered server pagination over 1,000,000 rows. It also has:
  - search, sorting, `FilterBar` and `QueryBuilder`
  - saved views
  - optimistic bulk suspend, which rolls back when a legal hold returns 409
  - background revalidation that keeps row identity, focus, selection and scroll
- Incidents (`/incidents`): `ListDetailLayout`. The selected pane and per-incident drafts survive navigation and refreshes.
- Authorization: switch to the viewer role in the header or the command palette. Account rows clear in the same task, even when a refresh is still in flight. Granting the role back waits for the server.
- Settings (`/settings`): `SettingsLayout` for appearance, the revalidation interval and notification switches.
- SSR: the server renders the first page of every region. A bootstrap JSON script hands that data to hydration, so markup is complete without JavaScript.
- Superseded requests abort, and stale responses are rejected by a monotonic token.
