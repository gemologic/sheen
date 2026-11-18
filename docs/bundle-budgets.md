# Bundle budgets

`pnpm check:consumers` copies built package artifacts into an isolated temporary package graph and measures production-minified gzip bytes. Solid is external because it is a peer. Direct runtime dependencies remain in the measured consumer bundle. CSS is measured separately from JavaScript.

The passing gates are:

- `core.css` plus one independently selectable theme and accent: under 3,500 bytes gzip (measured 3,043).
- `core.css` plus all seven themes and twelve accents: under 7,000 bytes gzip (measured 6,167). Bundled themes emit no `@supports` override block, and tier-one ramps live in the opt-in `primitives.css`.
- runtime token metadata and accent data imported from the package root: no retained theme compiler, palette audit, primitive generation, or color conversion modules.
- a root-package `Button` import: under 5,000 bytes gzip and no retained headless, table, or chart modules.
- the complete `/core`, `/forms`, `/overlays`, `/navigation`, and `/ai` entries: under 32,000, 60,000, 55,000, 59,000, and 6,000 bytes gzip respectively.
- a representative application importing theme, form, overlay, and navigation components: under 55,000 bytes gzip.
- the `@gemologic/sheen-patterns/admin` application entry: under 81,000 bytes gzip (measured 80,116). It was 80,000 until chrome moved from text characters to `Glyph` icons, shortcut labels became platform-aware, and the shell switched to the shared breakpoint helper.
- the DataTable entry plus its static imports: under 110,000 bytes gzip (measured 107,824 initial, with an 819-byte client export chunk loaded on first use).
- the date entries: date core, DateField, DatePicker, and DateTimePicker under 6,000, 32,500, 58,000, and 104,000 bytes gzip (see [date and time](date-time.md)).
- the `CodeBlock` renderer entry: under 5,000 bytes gzip with no retained Shiki engine.
- a single icon through the literal `<Icon>` transform or a per-icon export, with Radix and Phosphor selected: under 1,500 bytes gzip each including the icon runtime (measured 1,282 literal and 1,298 per-icon), with no unrelated glyph or generated catalog retained. `DynamicIcon` with the complete 257-name registry: under 65,000 bytes gzip (measured 58,225). The registry grew from 42 to 257 names so applications stop reaching outside Sheen for common glyphs; `DynamicIcon` is the explicit opt-in to that whole catalog, and the 65,000-byte ceiling leaves room for roughly 25 more names before the cost is reconsidered. Names without Radix artwork reuse the Phosphor object, so the fallback adds no second copy of the path data.

The UI package exposes additive `/core`, `/forms`, `/overlays`, `/navigation`, and `/ai` dependency islands while retaining the root compatibility entry. Current measured baselines are 28,801, 56,258, 51,688, 58,051, and 4,636 bytes gzip; the representative application is 45,187 bytes. The navigation gate moved from 58,000 to 59,000 bytes when Pagination switched to shared chrome glyphs and Tabs gained its sliding indicator. The artificial root `export *` graph is 120,671 bytes gzip and remains report-only because it deliberately makes every public component live. Named root imports remain tree-shakeable, and the isolated `Button` fixture is 1,221 bytes gzip.

pnpm can create a production-only deployment dependency tree, but it does not remove JavaScript exports from a browser bundle. Vite/Rolldown can tree-shake unused ESM and split chunks, but only when package boundaries, export maps, side-effect declarations, and application imports make those branches statically removable. These fixtures therefore measure copied built artifacts through the same production bundler contract rather than inferring bundle cost from installed package count. Replacing established accessible primitives is reserved for a measured component-specific problem; it is not the default bundle strategy.

Token CSS has separate theme and accent entry points. `themes/<name>.css` contains only that theme, `accents/<name>.css` contains only that accent's light/dark rules plus its Contrast override, and `themes.css` remains the all-in entry. The private-theme consumer resolves these public exports from copied package artifacts, not workspace aliases.
