# Sheen

An accessible, themeable design system for SolidJS applications. It's dark-first, SSR-complete, and built for dense operational UIs: admin consoles, data tables, live charts, and trading-style dashboards.

- **Workbench and component docs:** [sheen.gemologic.dev](https://sheen.gemologic.dev)
- **npm:** [@gemologic/sheen](https://www.npmjs.com/package/@gemologic/sheen)
- **Agent context:** [`llms.txt`](https://sheen.gemologic.dev/llms.txt) (compact) and [`llms-full.txt`](https://sheen.gemologic.dev/llms-full.txt) (complete)
- **Upgrading from 0.2:** [docs/upgrade-0.3.md](docs/upgrade-0.3.md)

## Packages

All packages share one version.

| Package                                          | What it is                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [`@gemologic/sheen`](packages/ui)                | Core components, theming, overlays, forms, navigation, chat (`/ai`), sortable lists (`/sortable`), and the `sheenRuntime()` Vite plugin. |
| [`@gemologic/sheen-tokens`](packages/tokens)     | Themes, accent presets, IBM Plex fonts, semantic tokens, and the theme and accent compiler.                                              |
| [`@gemologic/sheen-icons`](packages/icons)       | A semantic icon catalog with build-time-selectable icon sets.                                                                            |
| [`@gemologic/sheen-patterns`](packages/patterns) | Application layouts: AdminApp, auth frames, settings and list-detail layouts, and marketing sections.                                    |
| [`@gemologic/sheen-table`](packages/table)       | DataTable and QueryBuilder, with pagination, virtualization, filtering, selection, export, and editing.                                  |
| [`@gemologic/sheen-charts`](packages/charts)     | SVG and canvas charts, including streaming time series.                                                                                  |
| [`@gemologic/sheen-date`](packages/date)         | Locale- and timezone-aware date, time, and range controls.                                                                               |
| [`@gemologic/sheen-code`](packages/code)         | Code blocks, plus diff, log, and JSON viewers.                                                                                           |
| [`@gemologic/sheen-cli`](packages/cli)           | The `sheen` command for scaffolds, `doctor`, and agent-skill sync.                                                                       |
| [`eslint-plugin-sheen`](packages/eslint-plugin)  | Lint rules for tokens, package boundaries, Solid reactivity, and motion.                                                                 |

## Quick start

Scaffold a new SolidStart app:

```sh
pnpm dlx @gemologic/sheen-cli new app ./my-app
```

Or add Sheen to an existing Vite or SolidStart app. Sheen requires exactly `solid-js@1.9.19`.

```sh
pnpm add @gemologic/sheen @gemologic/sheen-tokens solid-js@1.9.19
```

```ts
// vite.config.ts (or your SolidStart config)
import { sheenRuntime } from '@gemologic/sheen/vite';

export default { plugins: [sheenRuntime() /* your Solid/SolidStart plugin */] };
```

```css
@import '@gemologic/sheen-tokens/fonts.css';
@import '@gemologic/sheen-tokens/themes.css';
@import '@gemologic/sheen-tokens/core.css';
@import '@gemologic/sheen/styles.css';
```

```tsx
import { Button, ThemeProvider } from '@gemologic/sheen';

export function App() {
  return (
    <ThemeProvider>
      <Button>Continue</Button>
    </ThemeProvider>
  );
}
```

The [UI package README](packages/ui/README.md) covers the details. [Hydration](docs/hydration.md) and [UI consumers](docs/ui-consumers.md) explain the SSR and bundling contracts.

## Examples

- [`examples/ops-console`](examples/ops-console) is an operations console built on AdminApp. It has a million-row server-paginated table, saved views, optimistic bulk actions, role changes, and streaming charts.
- [`examples/market-desk`](examples/market-desk) is a trading desk with a 30–60Hz streaming price chart, a live order book and blotter, and an order ticket.

Both are SolidStart SSR apps that run on synthetic data from their own API routes. Start one with `pnpm --filter ops-console dev` or `pnpm --filter market-desk dev`.

## Development

The dev environment comes from `default.nix` (Node 24, pnpm 11).

```sh
sheen-install -- --frozen-lockfile
pnpm dev        # Loupe, the SSR workbench, on http://127.0.0.1:4173
sheen-check     # build, lint, typecheck, unit tests, manifest
```

To run the browser tests, install the pinned Chromium once, then use the Nix wrapper:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright install chromium
sheen-browser
```

`.github/workflows` defines CI, and local checks should match it. More guides:

- [Component authoring](docs/component-authoring.md): the metadata, example, and demo contract. `pnpm manifest` regenerates the agent context.
- [Agent context](docs/agent-context.md): the generated `llms.txt` files and the vendorable skill.
- [Benchmarks](docs/table-benchmarks.md): the table, AdminApp, date, chart, and Composer workloads and their gates.
- [GitHub Pages](docs/pages.md): what the public workbench build includes.
- [Private themes](docs/private-themes.md): the theme compiler and its migration contract.

## Releases

Changesets maintains a version pull request, and publishing is a manual, protected workflow. See the [release policy](docs/releases.md). Report security issues through the [security policy](SECURITY.md).

## License

[MIT](LICENSE)
