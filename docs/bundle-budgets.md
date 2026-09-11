# Bundle budgets

`pnpm check:consumers` copies built package artifacts into an isolated temporary package graph and measures production-minified gzip bytes. Solid is external because it is a peer. Direct runtime dependencies remain in the measured consumer bundle. CSS is measured separately from JavaScript.

The passing gates are:

- `core.css` plus one independently selectable theme and accent: under 12,000 bytes gzip.
- `core.css` plus all seven themes and twelve accents: under 30,000 bytes gzip.
- a root-package `Button` import: under 5,000 bytes gzip and no retained headless, table, or chart modules.
- the complete `/core`, `/forms`, `/overlays`, and `/navigation` entries: under 32,000, 60,000, 55,000, and 58,000 bytes gzip respectively.
- a representative application importing theme, form, overlay, and navigation components: under 55,000 bytes gzip.
- the `CodeBlock` renderer entry: under 5,000 bytes gzip with no retained Shiki engine.

The UI package exposes additive `/core`, `/forms`, `/overlays`, and `/navigation` dependency islands while retaining the root compatibility entry. Current measured baselines are 28,215, 56,022, 51,333, and 57,179 bytes gzip; the representative application is 44,594 bytes. The artificial root `export *` graph is 116,730 bytes gzip and remains report-only because it deliberately makes every public component live. Named root imports remain tree-shakeable, and the isolated `Button` fixture is 1,111 bytes gzip.

pnpm can create a production-only deployment dependency tree, but it does not remove JavaScript exports from a browser bundle. Vite/Rolldown can tree-shake unused ESM and split chunks, but only when package boundaries, export maps, side-effect declarations, and application imports make those branches statically removable. These fixtures therefore measure copied built artifacts through the same production bundler contract rather than inferring bundle cost from installed package count. Replacing established accessible primitives is reserved for a measured component-specific problem; it is not the default bundle strategy.

Token CSS has separate theme and accent entry points. `themes/<name>.css` contains only that theme, `accents/<name>.css` contains only that accent's light/dark rules plus its Contrast override, and `themes.css` remains the all-in entry. The private-theme consumer resolves these public exports from copied package artifacts, not workspace aliases.
