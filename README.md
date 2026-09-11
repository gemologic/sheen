# Sheen

SolidJS design-system workspace. Loupe is the SolidStart SSR preview.

[sheen.gemologic.dev](https://sheen.gemologic.dev) is the prerendered public workbench. The npm packages are not published yet; the repository remains release-candidate software until the package and manual accessibility gates in `TODO.md` are complete.

## Development

Use the existing `default.nix` environment (Node 24 and pnpm 11). Dependencies are pinned in `pnpm-lock.yaml`.

```sh
sheen-install -- --frozen-lockfile
sheen-check
pnpm dev
```

Loupe listens on `0.0.0.0:4173`; use `http://127.0.0.1:4173` on the host or the machine's Tailscale address from another device. `pnpm check` builds the libraries and Loupe, runs lint/typechecks and unit tests, and verifies private-theme and native UI consumption from isolated built package files. The root build order ensures workspace package declarations exist before consumer typechecks. See [private themes](docs/private-themes.md) for the compiler and migration contract and [UI consumers](docs/ui-consumers.md) for export, type, CSS, and tree-shaking checks and their limits.

Browser tests run against the real SolidStart server. Install the browser matching the lockfile once, then run the Nix wrapper, which supplies its native library path:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright install chromium
sheen-browser
```

On Ubuntu, CI uses `playwright install --with-deps chromium` and `pnpm test:browser` directly. Do not substitute a different installed Chromium for the pinned test browser.

Build and inspect the exact static GitHub Pages artifact with:

```sh
pnpm build:pages
pnpm check:pages
pnpm test:pages
```

The Pages artifact contains the landing page and server-independent workbench routes only. Loupe's API-backed fixtures remain part of the SSR development application and are never uploaded. See [GitHub Pages](docs/pages.md) for the deployment and custom-domain boundary.

Run the calibrated production DataTable workload with `sheen-benchmark` or `pnpm benchmark:table`, the heavy AdminApp workload with `pnpm benchmark:admin`, the date overlay workload with `sheen-benchmark-date` or `pnpm benchmark:date`, and the Composer continuity workload with `sheen-benchmark-composer` or `pnpm benchmark:composer`. They write complete five-run records under `test-results/bench/`. See [table benchmarks](docs/table-benchmarks.md), [AdminApp](docs/admin-app.md), [date and time](docs/date-time.md), and [Composer](docs/composer.md) for their workloads, gates, and rebaseline contracts.

## Current implementation

- Token compiler with reference/cycle diagnostics, schema-version defaults, scoped CSS, OKLCH/sRGB output, and WCAG contrast checks.
- Six initial themes, each with light/dark modes, and twelve independent accent presets.
- Theme provider/scopes, persisted dark-default bootstrap, and the complete accessible UI component inventory.
- A [cross-system laboratory](docs/loupe-lab.md) with URL-backed theme axes, persistent root preferences, explicit locale, and a resizable retained iframe preview.
- A [layout gallery](docs/layout-gallery.md) with retained-refresh dashboard, list-detail, settings, form-heavy, and reading compositions plus the same full DataTable surface over deterministic 100k paginated or continuous data.
- A [compact AdminApp starter](docs/admin-app.md) with configurable semantic chrome, six operational metrics, time-series and regional charts, service health, activity, account details, route-complete content, and an explicit 12,000-row/20,000-point heavy mode at `/admin?workload=heavy&table=continuous`.
- A [theme editor](docs/theme-editor.md) with scoped rAF-batched token writes, OKLCH controls, strict derivation/import/export gates, and recoverable client-only work in progress behind a hydration-stable dark boundary.
- A [token explorer](docs/token-explorer.md) with generated manifest consumers, computed values, live WCAG diagnostics, and five chart-palette simulations. Signed perceptual Lc output remains pending official-package approval and its required integration notices.
- Real SSR preview and browser checks for scoped overlays, persisted preferences, delayed hydration, and input identity across accent changes.
- Cookie-mode SSR and persistence via a real endpoint, including offline failure without changing accepted state.
- Serializable [date and time controls](docs/date-time.md) with scoped overlays, explicit IANA zones and DST resolution, native form projection, retained async options, table-filter injection, isolated package budgets, and a calibrated production benchmark.
- An [Application Composer](docs/composer.md) that starts from the branded compact AdminApp, edits a constrained private layout document, and emits deterministic copyable public-API TSX. Its pointer engine is lazy and Loupe-only; every edit also has a keyboard-operable control.

The package implementation is ready for a `0.1.0-rc` qualification cycle. `SPEC.md` and `TODO.md` retain the larger 1.0 scope. The remaining external gates are a reviewed public history, hosted CI, registry-installed npm/pnpm/Bun consumers, manual NVDA/Firefox and VoiceOver/Safari passes, upstream or replacement qualification for the pinned Solid/Kobalte patches, and later viz/metron dogfood. Assay remains deliberately paused and is not a 0.1 release-candidate blocker. Passing local checks is not publication authorization or the v1 release gate.

Component authors should follow the [metadata/demo contract](docs/component-authoring.md). `pnpm manifest` generates exhaustive prop information, typechecks every documented example, and refreshes the compact/full agent context plus the vendorable Sheen skill; it is part of `pnpm check`. See [agent context](docs/agent-context.md) for the generated-artifact and budget contract.

The dependency-free CLI package now provides guarded app/theme/component scaffolds and fail-closed vendored-skill synchronization. The app scaffold carries the dark-default hydration/keyboard bootstraps, public router/shell seams, recommended lint, vendored context, and qualified compatibility patches, and passes an isolated production build. See the [CLI contract](docs/cli.md) for paths, previews, overwrite refusal, and the remaining M5 qualification boundary.

The [ESLint plugin](docs/lint.md) enforces all specified JavaScript/TypeScript rule families, including token/directionality, dependency wrappers, Solid reactivity, fixed-shell scrolling, motion, icon semantics, explicit unsafe seams, and layout composition. Standalone CSS enforcement remains tracked in `TODO.md`.

Release versioning, package-content checks, deprecation windows, codemod requirements, public-repository setup, and the protected npm bootstrap/OIDC process are documented in [the release policy](docs/releases.md). The automatic release workflow only maintains a version pull request. The separate publication workflow is manual, main-only, artifact-bound, and gated by the protected `npm` environment.

All public packages stay at the development version `0.0.0` in this checkout. The reviewed Changeset creates the fixed `0.1.0` line after the repository has a real `main` history; enter Changesets prerelease mode first so the initial registry build is `0.1.0-rc.0` on the `next` tag. `pnpm check:packages` refuses a stable version while workspace dependency patches remain.

Security reports should follow [the security policy](SECURITY.md), not a public issue containing vulnerability details.

## Dependency decisions

The audited spec selected Solid, SolidStart, Kobalte, Tailwind, Vite, Vitest, Playwright, and the class/variant helpers. Solid is pinned to 1.9.15. SolidStart 2.0.4 remains compatible with Solid 1.9 and uses Vite 8; its version is independent of the deferred Solid 2 migration. TypeScript 6.0.3 satisfies typescript-eslint 8.69's `<6.1` peer range; TypeScript 7 does not.

See the [SolidStart configuration guide](https://docs.solidjs.com/solid-start/v2/getting-started), [Vite library build options](https://vite.dev/config/build-options.html), and installed package peer metadata when refreshing these pins.
