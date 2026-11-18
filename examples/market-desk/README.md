# market-desk

Example trading desk built on Sheen. It is a SolidStart SSR app. Its synthetic market is a pure function of instrument and UTC time, so server history, order validation and the client feed all agree.

## Run

```sh
pnpm install            # from the repo root; links workspace packages
pnpm --filter market-desk dev        # http://127.0.0.1:4320
pnpm --filter market-desk build
pnpm --filter market-desk typecheck
pnpm --filter market-desk lint
```

Smoke tests: `pnpm exec playwright test --config tests/examples/playwright.config.ts --project market-desk`. These include the Analysis route: server placeholder, streamed values, mode change and teardown.

## What it exercises

- Price direction uses only the `market-up`, `market-down` and `market-flat` tokens, each paired with a glyph. Accent is never used for direction.
- Watchlist: 50 instruments with live `Sparkline`s. Rows link to `/?symbol=…`.
- Price chart: a multi-series `TimeSeries` (last, bid, ask) that runs at 30Hz, or 60Hz in tick storm mode.
  - Times are strictly increasing UTC epoch ms in a `Float64Array`.
  - Trading halts appear as NaN gaps.
  - The timezone selector changes formatting only.
- Order book and blotter: `DataTable`s with stable row IDs. Cells update at 10Hz, or 20Hz in storm mode, through `cellDependencies`, so rows and focus survive each tick.
- Order ticket: a `Drawer` with `SegmentedControl`, `Select` and `NumberField`. The server accepts, rejects or partially fills the order, and the toaster reports fills.
- Tick storm switch: raises every feed rate. The status bar shows publications per second.
- Changing symbol aborts the in-flight history request and rejects stale responses.
- Header navigation links the desk and the Analysis route; the color mode select drives Sheen's root theme state.

## Analysis route (Perspective)

`/analysis` uses [Perspective](https://github.com/perspective-dev/perspective) directly, with no Sheen wrapper. It is a dependency of this example only; no published Sheen package depends on it.

| Package | Version | Role |
| --- | --- | --- |
| `@perspective-dev/client` | 5.6.1 | Engine client; runs the engine in a Web Worker |
| `@perspective-dev/server` | 5.6.1 | Engine WASM (`perspective-server.wasm`) |
| `@perspective-dev/viewer` | 5.6.1 | `<perspective-viewer>` custom element and its WASM |
| `@perspective-dev/viewer-datagrid` | 5.6.1 | Datagrid / pivot plugin |
| `@perspective-dev/viewer-charts` | 5.6.1 | WebGL chart plugins. It replaced `viewer-d3fc`, which stopped at 4.x and does not support the 5.x viewer. |

How it is wired:

- `src/lib/flow.ts` simulates 240 desk orders as a pure function of UTC time. Each order has a stable ID (`flow-000` to `flow-239`). The Perspective table is indexed on `id`, so every `table.update()` replaces those rows in place and the table stays bounded.
- `src/routes/analysis.tsx` server-renders the heading, description, both figure regions and a loading status. After mount it dynamically imports `src/perspective.ts`. That module registers the custom elements and fetches the WASM, so none of it is in the server bundle or the desk's chunks. Updates are sent on the desk's book clock (10 Hz, or 20 Hz under tick storm). A tick is skipped while the previous `update()` is still in flight.
- WASM is loaded the way Perspective's Vite docs describe: `?url` imports passed to `init_server` / `init_client`. Vite 8's default build target worked, so `build.target: "esnext"` was not needed.
- The grid pivots `filled` and `notional` (both summed) by `symbol`, split by `side`. The chart is a stacked `Y Bar` of notional by `venue`, split by `side`.
- Cleanup when the route unmounts: the clock stops with its owner. An abort signal cancels a mount that is still in progress. Then teardown runs in reverse creation order: `viewer.delete()` and element removal for each viewer, then `table.delete()`, then `client.terminate()`, which ends the engine worker.
- Theming: `app.css` declares a Perspective theme named `Sheen`. Each `--psp-*` variable maps to a tier-two Sheen token: surfaces, text, borders, accent, status, `chart-1..8`, `chart-grid`/`chart-axis`, fonts, and market up/down for signed cells. The cascade carries theme, mode and accent changes to the viewer DOM. The route watches tokens through `useThemeTokens` and calls `restyleElement()`, which makes the WebGL charts re-read them. `pro.css` is imported only for the structural variables (icons, labels, sizes) that the Sheen theme does not override.

### CSP

These requirements come from reading Perspective's bundles. They were not tested under an enforcing policy. To deploy behind a Content Security Policy, allow:

- `script-src 'wasm-unsafe-eval'`, which compiles the engine and viewer WebAssembly.
- `worker-src blob:`. The engine worker and the chart plugin's render worker are both created from `blob:` URLs.
- `connect-src 'self'`, for the `fetch()` of the two `.wasm` assets.
- `style-src` may also need `'unsafe-inline'`. The viewer and datagrid style elements at runtime, and that is unverified.

### Bundle cost

Measured from `pnpm --filter market-desk build`. Gzip is `gzip -9`. Brotli is not installed locally, so it was not measured.

| Asset | Raw | Gzip |
| --- | --- | --- |
| `perspective-server.wasm` | 2.62 MB | 2.59 MB |
| `perspective-viewer.wasm` | 1.65 MB | 1.64 MB |
| `perspective-*.js` (client, viewer, datagrid, charts) | 555 KB | 163 KB |
| `perspective-*.css` (`pro.css`) | 93 KB | 19 KB |

That is about 4.9 MB raw and 4.4 MB gzip, all loaded lazily by `/analysis`. The WASM files ship already compressed, so transport compression barely shrinks them. The Memory64 engine binary is not registered, so it is never emitted or fetched. The 555 KB chunk sets off Vite's 500 KB chunk-size warning, and that warning is expected.

### Limitations observed (Chromium)

- SSR: Perspective cannot render on the server. The server sends a placeholder with a heading, a description and a status line. Without JavaScript, the actual figures never appear.
- Accessibility: axe reports 2 critical `button-name` violations, from unnamed icon buttons in the viewer's title bar, and 4 minor `empty-table-header` violations from the pivot's corner headers. The datagrid is a real `<table>` inside the element's shadow root, but its `th` cells have no `scope` and it has no caption. The pivot hierarchy is not exposed as a tree or with `aria-level`. WebGL chart canvases have no accessible name and no data alternative. The `figcaption`s in this route are the only names. The grid is focusable, but keyboard navigation follows Perspective's own model, not Sheen's table conventions.
- RTL: with `dir="rtl"` the datagrid reverses column order and moves row headers to the inline end, but the tree indentation glyphs render incorrectly. Charts do not mirror.
- The chart plugin keeps one page-level render worker after its viewers are deleted. The app cannot terminate it, but it is reused if the route mounts again.
- Perspective logs `Unknown browser detected` in Playwright's Chromium build.
- Viewer chrome (labels, number formats) comes from Perspective's own CSS-variable i18n. It does not use Sheen's locale or `NumberText` formatting.
