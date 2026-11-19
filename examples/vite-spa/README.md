# vite-spa

A minimal client-only Sheen app: plain Vite with `vite-plugin-solid`, a static `index.html`, and `render` from `solid-js/web`. It has no SolidStart, SSR or hydration. It renders an `AppShell` with a header, sidebar navigation and one continuous client-mode `DataTable` over 24 in-memory rows.

## Run

```sh
pnpm install                       # from the repo root; links workspace packages
pnpm --filter vite-spa dev         # http://127.0.0.1:4330
pnpm --filter vite-spa build
pnpm --filter vite-spa preview
pnpm --filter vite-spa typecheck
pnpm --filter vite-spa lint
```

Smoke test (starts only this app's dev server):

```sh
SHEEN_EXAMPLE=vite-spa pnpm exec playwright test --config tests/examples/playwright.config.ts --project vite-spa
```

Set `SHEEN_VITE_SPA_PORT` to use a port other than 4330.

## How it is wired

- **Runtime plugin.** `vite.config.ts` lists `sheenRuntime()` from `@gemologic/sheen/vite` first. It points browser `solid-js/web` imports at Sheen's patched DOM renderer and dedupes the app's `solid-js@1.9.19` core. The app needs no patches or consumer-side configuration beyond that.
- **Icon plugin.** `sheenIcons({ sets: ["radix", "phosphor"] })` from `@gemologic/sheen-icons/vite` keeps only the referenced glyphs of at most two sets.
- **Theme bootstrap.** A plain SPA has no server document, so a small `transformIndexHtml` plugin in `vite.config.ts` injects `createThemeScript()` from `@gemologic/sheen/theme-script` as an inline, blocking `<script>` in `<head>`. It runs in dev and build. The Node config import resolves the package's prebuilt `dist` entry. The script reads the saved preference from `localStorage` and sets `data-sheen-*`, `dir` and `lang` on `<html>` before first paint, so the page never flashes the wrong theme. `ThemeProvider hydration="client" defaultMode="dark"` then adopts those attributes on mount and owns them from then on. Dark is the fresh-install default. There is nothing to hydrate, so `createKeyboardHydrationScript()` is unnecessary.
- **CSS islands.** `src/app.css` imports the token CSS (fonts, themes, core) first. Next come `@gemologic/sheen/styles/core.css` and only the UI islands the app's components render: forms (DataTable search and checkboxes), overlays (the shell drawer and table menus) and navigation (NavList, Collapsible, ScrollArea and Pagination). The icons, table and patterns sheets come last. It skips `@gemologic/sheen/styles.css` and the `ai` island. Component imports come from the matching JS entry (`@gemologic/sheen/core`). Table and patterns still import the UI root internally.
- **Patterns peer.** `@solidjs/meta` is listed only because it is a required peer of `@gemologic/sheen-patterns`. The app never renders `Title`, since it sets no `documentTitle`, so it needs no `MetaProvider`.

## Why AppShell and not AdminApp

`AppShell` is the smallest frame that gives native banner, complementary and main landmarks and a responsive sidebar drawer. `AdminApp` adds product, workspace, account, command and notification models, which are app-owned data this example does not have. With a single view there is no router, so `SidebarNav` reads `window.location.pathname`. Add `@solidjs/router` and pass `useSolidRouterAdapter()` from `@gemologic/sheen-patterns/solid-router` to `AppShell` once the app has real routes.
