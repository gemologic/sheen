# `sheen` — Design System Specification

**Owner:** Gemologic
**Status:** Draft v4, application-readiness and Composer decisions incorporated; implementation tracked in TODO.md
**Target consumers:** Gemologic-owned SolidJS frontends and applications

---

## 0. Summary

`sheen` is a versioned, npm-distributed design system for SolidJS: design tokens, a runtime theme engine, a component library, opinionated application layouts, a high-performance data table, a chart layer, and the tooling that makes coding agents use it correctly without being told twice.

The name is a gemological optical property (how light scatters off a surface). The kitchen-sink / documentation app is `loupe` (a jeweler's magnifier).

### Goals

1. **Applications, not documents.** Everything built with `sheen` should feel like a native desktop application — fixed viewport, keyboard-first, instant, dense. Reference point: Linear. See §2 and §6.
2. One import surface. Every app gets the same buttons, tables, dialogs, and page shells.
3. Themeable at runtime, including multiple themes visible on screen simultaneously.
4. Agent-legible. An agent with the repo's `llms.txt` in context should produce correct, idiomatic `sheen` code on the first try, and get a lint error when it doesn't.
5. Fast, with numbers attached. No runtime CSS-in-JS. 100k-row tables and 100k-point charts at 60fps. See §14.
6. Consumable without a JS build — the token layer ships as plain CSS.

### Non-goals

- Not a public product. Optimize for one team of one plus agents.
- Not framework-agnostic. Solid only. Do not build a React adapter.
- Not a CSS framework. Tailwind v4 stays; `sheen` sits on top.
- **Not for marketing sites.** No hero sections, no scroll-driven animation, no landing page components.
- Not mobile-first. Desktop-first with a usable tablet/mobile fallback.

---

## 1. Foundational decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | SolidJS 1.9.x, pinned | Solid 2.0 is in beta with signals rewritten from scratch; Kobalte's 2.0 migration is in flight. Track it, don't adopt it yet. |
| Headless primitives | Kobalte (primary), corvu (drawer, resizable, otp), Ark UI only for gaps | Kobalte is the Radix-equivalent for Solid with the widest coverage. |
| Styling | Tailwind CSS v4, CSS-first `@theme` config | v4's CSS-native config lets the token package ship as pure CSS with zero build step. |
| Variants | Sheen-owned typed class recipes | The package needs stable semantic classes, not a runtime Tailwind parser. This keeps single-component imports within budget. |
| Class merge | `clsx` behind `cn()` plus cascade layers | `cn()` flattens conditional values; lower-priority component layers make consumer utilities override without runtime conflict tables. |
| Icons | Iconify sets inlined at build time, behind a semantic registry. Radix Icons for chrome, Phosphor for the long tail. | §12. Lucide is drawn on a 24px grid and reads chunky at 16px, which is where app icons live. |
| Time-series charts | uPlot (canvas) | ~45KB, handles millions of points, purpose-built for time series. Nothing SVG-based competes at density. §11. |
| Statistical charts | Hand-rolled SVG on `d3-scale` + `d3-shape` | A fixed chart vocabulary costs ~15KB hand-rolled and gives total token control. §11. |
| Tables | Sheen-owned processing + `@tanstack/solid-virtual` | The measured row pipeline stays internal; virtualization is mandatory. §10. |
| Keyboard | Custom shortcut registry (§6.2) | No library does scoped, contextual, discoverable shortcuts well enough. |
| Package manager | pnpm workspaces | Required for the monorepo layout. |
| Build | `tsup` / `vite build --lib`, `preserveModules` | Components must be individually importable. |
| Versioning | Changesets, semver | Apps pin a range; breaking changes are explicit. |
| Registry | npm public, `@gemologic/*` | Nothing proprietary in the repo. |

### Version-churn hedge

Apps make no direct runtime imports from Kobalte, corvu, uPlot, or TanStack. Wrapper APIs own the supported contract. Re-export the type-only polymorphism seam as `SheenPolymorphicProps`; this is an accepted type dependency, not a guarantee that upstream changes can never affect consumers. `defineColumns` accepts only sheen fields and returns an opaque branded definition; TanStack column definitions are constructed internally. Explicit typed `column.__unsafe_tanstack` and `chart.__unsafe_uplot` escape hatches are lint-warned and greppable migration surfaces.

---

## 2. Design direction

### 2.1 What "like Linear" actually means

Most of Linear's identity is not its palette. Copying the palette produces a knockoff; copying the system properties produces the feel. In rough order of importance:

**Density.** Base UI text is 13px, not 16px. Control heights are 26–30px, not 40px. Table rows are 32–36px. Padding is measured in 4s and 8s, not 16s and 24s. This single axis accounts for more of the "app not website" feeling than anything else.

**Low-chroma chrome.** Backgrounds are near-black with almost no saturation. Muted text remains at least 4.5:1 against its supported surfaces; calmness comes from restrained chroma and warmth. Structural borders may be roughly 8% white. Boundaries needed to identify controls use a separate 3:1-gated token.

**Accent scarcity.** Exactly one accent hue, used only for genuinely interactive or active states. Not for headings, not for decoration, not for icons at rest. The accent should appear two or three times on a screen, not twenty.

**Fixed viewport.** The page does not scroll. Panes scroll. This is the structural difference between an app and a website and it is non-negotiable — see §6.1.

**Fast, small motion.** 100–150ms, no springs, no bounce. Menus scale-and-fade from their origin. Nothing animates on page load. Motion exists only to show what changed in response to an action.

**Keyboard parity.** Every action reachable by mouse is reachable by keyboard, and the shortcut is discoverable in the tooltip and the command palette.

**Restraint in structural devices.** Very few dividers, very few cards, very few shadows. Grouping is done with whitespace and subtle background shifts, not boxes inside boxes.

### 2.2 Anti-patterns

Reject these regardless of how they look in isolation:

- 16px base UI text and 40px controls — web defaults, immediately reads as a website
- Content in a centered `max-width` column inside app views
- Cards with identical radius and the same soft grey `rgba(0,0,0,.1)` shadow
- Tracked-out all-caps eyebrow labels above headings
- Fade-and-slide-up entrance animations on sections or cards
- Skeleton loaders on navigation between already-loaded views
- Full-page spinners
- `→` appended to link and button text
- Gradient washes used as decoration
- Cream `#F4F1EA` + terracotta `#D97757`, or near-black + acid-green — both are current generative-design defaults and will read as templated

### 2.3 Accent hue

Dark mode is the fresh-install default. Themes and accent presets are independently switchable at runtime, including within nested scopes. The initial implementation target is seven base themes (§5.9) and twelve accents: jade, teal, cyan, sky, blue, indigo, violet, purple, rose, red, orange, and amber. Each preset supplies the complete accent token family, with mode- and theme-aware values validated against the same contrast gates as the base theme. Accent choice never rewrites status or market colors. Jade is the default: the M0 comparison retained it because its cool, low-warmth interaction color stays quiet on Obsidian while remaining clear against both modes. Ship all presets regardless of the default.

---

## 3. Repository layout

```
sheen/
├── packages/
│   ├── tokens/           # @gemologic/sheen-tokens — CSS + TS tokens, themes
│   ├── icons/            # @gemologic/sheen-icons — registry, build, <Icon>
│   ├── ui/               # @gemologic/sheen — components + theme runtime + shortcuts
│   ├── date/             # @gemologic/sheen-date — calendar/date/time selectors
│   ├── table/            # @gemologic/sheen-table — DataTable
│   ├── charts/           # @gemologic/sheen-charts — uPlot + SVG chart layer
│   ├── patterns/         # @gemologic/sheen-patterns — AppShell, layouts
│   ├── eslint-plugin/    # eslint-plugin-sheen
│   └── cli/              # @gemologic/sheen-cli
├── apps/
│   └── loupe/            # kitchen sink, docs, theme editor, VR target
├── tools/
│   ├── build-themes.ts
│   ├── build-icons.ts
│   ├── build-manifest.ts
│   └── build-llms.ts
├── AGENTS.md
├── llms.txt
└── sheen.manifest.json
```

`date`, `table`, and `charts` are separate packages because their dependency footprints are meaningful and most apps need only a subset. Dependency order: `tokens` ← `icons` ← `ui` ← {`date`, `table`, `charts`} ← `patterns`. Loupe may use development-only Composer dependencies that never enter a published package. No cycles.

---

## 4. Token architecture

Three tiers. The tier boundary is the whole point — get it wrong and themes become unmaintainable.

### Tier 1 — Primitives

Raw values, named by what they are. Emitted under `:root`. **Components must never reference these.**

```
--sheen-gray-0 .. -1000        13-step OKLCH ramp, cool-shifted (hue ~265, chroma ≤0.006)
--sheen-jade-*, --sheen-amber-*, --sheen-cyan-*, --sheen-rose-*, --sheen-violet-*
--sheen-size-0 .. -96          4px base
--sheen-radius-0 .. -full
--sheen-font-size-1 .. -10
--sheen-shadow-1 .. -5
--sheen-duration-*, --sheen-ease-*
--sheen-z-*
```

Generate ramps in OKLCH for even perceptual spacing; emit `oklch()` with an sRGB hex fallback via `@supports`.

### Tier 2 — Semantic

What components use. Named by role. **This is the theme contract.** Minor additions require explicit versioned defaults through `defineTheme` so existing private themes continue to compile. Missing tokens without a versioned default fail validation. Removals and semantic changes require a major version.

```
/* surfaces */
--sheen-color-bg                app background
--sheen-color-bg-subtle         recessed: table stripes, inset panels
--sheen-color-bg-raised         cards, popovers, menus
--sheen-color-bg-overlay        modal scrim
--sheen-color-bg-inset          inputs, wells
--sheen-color-bg-hover          row/item hover
--sheen-color-bg-active         pressed
--sheen-color-bg-selected       selected row/item — distinct from hover and from focus

/* foreground */
--sheen-color-fg                primary text
--sheen-color-fg-muted          secondary text, labels, placeholders, resting icons
--sheen-color-fg-subtle         disabled or decorative content only
--sheen-color-fg-on-accent

/* lines */
--sheen-color-border            structural borders, dividers, table hairlines
--sheen-color-border-control    boundary needed to identify a control, gated at 3:1
--sheen-color-border-strong     emphasized
--sheen-color-border-subtle     hairlines between rows
--sheen-color-focus-ring        independent of accent
--sheen-color-focus-ring-offset surrounding surface color, redeclared by surfaces

/* accent — used sparingly, see §2.1 */
--sheen-color-accent
--sheen-color-accent-hover
--sheen-color-accent-active
--sheen-color-accent-subtle
--sheen-color-accent-fg

/* status — each with -subtle, -fg, -border */
--sheen-color-info-*  --sheen-color-success-*  --sheen-color-warning-*  --sheen-color-danger-*

/* domain — see §4.4 */
--sheen-color-market-up-*  --sheen-color-market-down-*  --sheen-color-market-flat-*

/* charts — see §11.4 */
--sheen-chart-1 .. --sheen-chart-8
--sheen-chart-grid  --sheen-chart-axis  --sheen-chart-crosshair
--sheen-chart-area-opacity  --sheen-chart-line-width

/* space, by role */
--sheen-space-inline-xs .. -xl     horizontal gaps inside controls
--sheen-space-block-xs .. -xl      vertical rhythm
--sheen-space-section
--sheen-space-gutter

/* controls */
--sheen-control-h-xs | -sm | -md | -lg
--sheen-control-px-xs | -sm | -md | -lg
--sheen-control-radius
--sheen-control-border-width

/* type roles */
--sheen-font-sans, --sheen-font-mono
--sheen-text-caption-*, -ui-sm-*, -ui-*, -body-*, -code-*
--sheen-text-h1-* .. -h4-*

/* icons — see §12 */
--sheen-icon-size-sm | -md | -lg
--sheen-icon-stroke

/* elevation */
--sheen-elevation-raised | -overlay | -modal
--sheen-surface-radius
```

### 4.1 Default scale values

The density numbers are the load-bearing part of §2.1. Defaults for `comfortable`:

| Token | Value | Note |
|---|---|---|
| `text-caption` | 11px / 16px | timestamps, meta |
| `text-ui-sm` | 12px / 16px | secondary labels, table cells |
| `text-ui` | **13px / 20px** | the base — buttons, menus, inputs, nav |
| `text-body` | 14px / 22px | prose and long-form content only |
| `text-h4` | 14px / 20px, 600 | |
| `text-h3` | 16px / 24px, 600 | |
| `text-h2` | 20px / 28px, 600 | |
| `text-h1` | 24px / 32px, 600 | no display sizes in app chrome |
| `control-h-xs` | 22px | |
| `control-h-sm` | 26px | |
| `control-h-md` | **30px** | default |
| `control-h-lg` | 36px | |
| `control-radius` | 5px | |
| `surface-radius` | 8px | |
| `control-border-width` | 1px | |
| `space-gutter` | 16px | |
| `space-section` | 24px | |
| `sidebar-w` | 220px | tier 3 |
| `topbar-h` | 44px | tier 3 |
| `table-row-h` | 34px | tier 3 |
| `duration-fast` | 100ms | |
| `duration-normal` | 150ms | |
| `duration-slow` | 250ms | ceiling |

### 4.2 Tier 3 — Component tokens

Escape hatch, always falling back to tier 2. Keep under ~25 total; every one is a maintenance liability.

```css
--sheen-button-radius:        var(--sheen-control-radius);
--sheen-table-row-h:          34px;
--sheen-sidebar-w:            220px;
--sheen-sidebar-w-collapsed:  48px;
--sheen-topbar-h:             44px;
--sheen-statusbar-h:          26px;
```

### 4.3 Tailwind bridge

`tokens/src/preset.css` maps tier 2 into utilities:

```css
@theme inline {
  --color-bg:         var(--sheen-color-bg);
  --color-bg-raised:  var(--sheen-color-bg-raised);
  --color-bg-hover:   var(--sheen-color-bg-hover);
  --color-fg:         var(--sheen-color-fg);
  --color-fg-muted:   var(--sheen-color-fg-muted);
  --color-accent:     var(--sheen-color-accent);
  --color-border:     var(--sheen-color-border);
  --radius-control:   var(--sheen-control-radius);
  --radius-surface:   var(--sheen-surface-radius);
  --font-sans:        var(--sheen-font-sans);
  --font-mono:        var(--sheen-font-mono);
  /* ... */
}
```

`@theme inline` (not plain `@theme`) is required — it emits the `var()` reference instead of resolving at build time, which is what makes runtime theme switching work.

### 4.4 Domain color namespace

In trading and monitoring UIs, green and red are already spent on P&L direction. `--sheen-color-market-*` is a separate family so a red down-tick can sit next to a red error alert unambiguously. Themes must give them visibly distinct treatments — e.g. market direction as saturated fills, danger as a desaturated crimson with an outline treatment.

---

## 5. Theme system

### 5.1 Definition format

Themes are TypeScript, type-checked against the tier-2 contract, compiled to CSS. `{path}` resolves references.

```ts
// packages/tokens/themes/obsidian.theme.ts
import { defineTheme } from "../src/define";

export default defineTheme({
  id: "obsidian",
  label: "Obsidian",
  description: "Dark-first, low-chroma. Default for dense internal tooling.",
  supports: ["light", "dark"],
  defaultMode: "dark",

  fonts: { sans: "'IBM Plex Sans', system-ui, sans-serif", mono: "'IBM Plex Mono', monospace" },
  iconSet: "radix",                       // §12.3 — icon sets are themeable

  dark: {
    "color-bg":          "{gray.980}",    // ~oklch(14% 0.004 265)
    "color-bg-subtle":   "{gray.960}",
    "color-bg-raised":   "{gray.940}",
    "color-bg-hover":    "color-mix(in oklab, {gray.0} 4%, transparent)",
    "color-bg-selected": "color-mix(in oklab, {color-accent} 12%, transparent)",
    "color-fg":          "{gray.30}",
    "color-fg-muted":    "{gray.400}",    // candidate shade; must pass 4.5:1 on supported surfaces
    "color-border":      "color-mix(in oklab, {gray.0} 8%, transparent)",
    "color-accent":      "{jade.500}",
    "color-focus-ring":  "{gray.100}", // independent color, validated per surface
    "focus-ring-offset": "{color-bg}",
    "control-radius":    "5px",
    // ...
  },
  light: { /* ... */ },
});
```

`defineTheme` validates every tier-2 token after applying explicit versioned defaults, all reference paths and cycles, and every declared contrast pairing (§5.6). Unknown keys and unresolved values fail with actionable diagnostics. Export `defineTheme` and `buildTheme()` from `@gemologic/sheen-tokens` so private consumers can compile and validate their own CSS without a fork.

### 5.2 Emitted CSS

```css
[data-sheen-theme="obsidian"] {
  color-scheme: light;
  --sheen-color-bg: oklch(99% 0.002 265);
  /* ... */
}
[data-sheen-theme="obsidian"][data-sheen-mode="dark"] {
  color-scheme: dark;
  --sheen-color-bg: oklch(14% 0.004 265);
  /* ... */
}
```

**Attribute selectors on any element, never `:root`.** Hard requirement — it's what makes nested scoping (§5.5) and `loupe`'s compare mode possible.

### 5.3 Modifier layers

Orthogonal to theme, independently composable.

```css
[data-sheen-density="compact"]     { --sheen-control-h-md: 26px; --sheen-table-row-h: 28px; --sheen-text-ui-size: 12px; }
[data-sheen-density="comfortable"] { /* defaults, §4.1 */ }
[data-sheen-density="spacious"]    { --sheen-control-h-md: 34px; --sheen-table-row-h: 42px; --sheen-text-ui-size: 14px; }

[data-sheen-radius="sharp"] { --sheen-control-radius: 0; --sheen-surface-radius: 0; }
[data-sheen-radius="soft"]  { /* default */ }
[data-sheen-radius="round"] { --sheen-control-radius: 999px; }

[data-sheen-motion="reduced"] { --sheen-duration-fast: 0ms; --sheen-duration-normal: 0ms; --sheen-duration-slow: 0ms; }
```

Plus `@media (prefers-reduced-motion: reduce)` applying the same overrides.

**Logical properties rule.** All components use `padding-inline`, `margin-block-start`, `inset-inline-end`, and Tailwind's `ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`. No `left`/`right` anywhere. Cheap from day one, miserable to retrofit.

### 5.4 Runtime API

```tsx
<ThemeProvider
  themes={[obsidian, paper, vellum, contrast, slate, graphite, studio]}
  defaultTheme="obsidian"
  defaultMode="dark"
  defaultAccent="jade"
  hydration="client"
  locale="en-US"
  messages={englishMessages}
  defaultDensity="comfortable"
  storageKey="sheen"
>
  <App />
</ThemeProvider>
```

`ThemeProvider` retains `comfortable` as its general default. The opinionated `AdminApp` pattern (§6.10) establishes a nested `compact` application scope by default, overridable explicitly, so a standalone form or reading surface does not silently inherit admin density.

```tsx
const t = useTheme();
t.theme(); t.setTheme("paper");
t.mode(); t.resolvedMode(); t.setMode("dark");
t.accent(); t.setAccent("violet");
t.density(); t.setDensity("compact");
t.radius(); t.setRadius("soft");
t.themes();          // metadata for building a picker
```

### 5.5 Nested scoping

```tsx
<ThemeScope theme="paper" mode="light" density="compact">
  <PreviewPane />
</ThemeScope>
```

The API accepts partial overrides of theme, mode, accent, density, radius, motion, locale, and direction. Resolve omitted axes through parent context and emit complete effective attributes on the scope and its portal target. CSS inheritance alone is insufficient when nested theme rules redeclare defaults. Explicit `null` resets an axis to the root provider’s configured default.

Each provider and scope owns a contextual portal target inside its boundary but outside designated scrolling panes. Every overlay uses that target, never `document.body`. Consumer ancestors that clip the target are unsupported. Overlay ordering is coordinated per provider across scope targets; Escape dismisses only the topmost eligible layer. Full-layout comparisons use isolated iframes.

Only the root provider persists. Scoped setters throw in development unless the scope is explicitly `controllable`; read-only scopes never mutate root state in production either. Controllable scopes update only their local overrides. `useTheme()` always reports effective scoped state.

### 5.6 Contrast validation

`build-themes.ts` fails the build on:

- `fg` on each of `bg`, `bg-subtle`, `bg-raised`, `bg-inset` — WCAG AA (4.5:1)
- `fg-muted`, including placeholders, on the same surfaces: WCAG AA, 4.5:1. Only disabled or decorative content may use ungated `fg-subtle`. A real label does not exempt placeholder text.
- `fg-on-accent` on `accent` — AA
- `border-control` against actual adjacent surfaces: 3:1 where the boundary identifies the control. Structural `border` has no contrast gate.
- Visible focus indicator against actual adjacent colors: at least 3:1. Use an independent outer `focus-ring` and an inner surface-colored `focus-ring-offset`; surfaces redeclare the offset. Do not require the offset itself to contrast with the component fill, which would reject ghost controls. Validate real component/surface combinations, not only token pairs.
- Status, solid-tone text, and every supported theme/mode/accent pairing must meet their text and required non-text contrast gates. `contrast` additionally targets AAA text contrast.
- adjacent `--sheen-chart-N` pairs — CAM16-UCS distance at least 18 under the standard sRGB viewing condition, and at least 7 after each severity-1 Machado protanopia, deuteranopia, and tritanopia simulation. The committed conversion, threshold, and bundled-palette fixtures are the rebaseline boundary.

The validator reports every gated failure rather than stopping at the first. Its audit API also records the weakest arbitrary pair and severity-1 achromatopsia preview. Achromatopsia is intentionally not assigned a color-distance pass threshold: color alone cannot encode distinctions without color perception. Charts must expose labels and use line style, marker shape, direct annotation, or another non-color encoding wherever a distinction is necessary; Loupe displays the complete matrix rather than presenting a color-only accessibility badge.

Report every failure with actual ratios, not just the first.

### 5.7 FOUC prevention

Ship a minified blocking snippet at `@gemologic/sheen/theme-script`, inlined in `<head>` before content and supported by a CSP nonce/hash. It validates stored IDs and axes, handles unavailable or malformed storage, and falls back to the configured dark default. A valid explicit saved mode wins; consult `prefers-color-scheme` only when the user chose `system`. Load selected theme and accent CSS before first paint.

Two hydration modes:

- `client` (default): the server omits the script-owned `<html>` theme attributes and Solid never reconciles them. The script applies preferences before paint. Components use deterministic server state through initial hydration, then adopt script-resolved preferences on mount. Scope/provider wrapper attributes must not override the prepaint root theme with default colors during this handoff. Theme-dependent text uses a stable, size-reserved hydration presentation until preferences are adopted.
- `cookie`: the app supplies request-resolved preferences identically to server and client; SSR emits attributes and the theme script is skipped. Changes persist through an app callback before updating local state, without requiring full navigation. Persistence failure retains prior state and reports an actionable error.

Explicit locale, stable IDs, serialized initial data, and deterministic markup are mandatory in both modes. Do not branch initial markup on browser-only media queries, time, or random values. Use Solid’s hydration bootstrap as required by SolidStart; the theme script is not a replacement. Canvas enhancements mount into a size-reserved SSR fallback without replacing surrounding content. Browser tests cover first paint, delayed JS, hydration, stored overrides, nested scopes, portals, and navigation (§14).

`ThemeProvider.messages` carries core UI translations and typed extension values for dependent packages. Each separate package ships its own tree-shakeable English catalog and resolves its extension values from the same scoped provider context. This keeps, for example, the table/filter catalog out of applications that import only `@gemologic/sheen`, without introducing a second locale or scope owner.

### 5.8 Canvas token bridge

Canvas can't read CSS custom properties, and charts need resolved values that update when the theme changes.

```ts
const c = useThemeTokens(["--sheen-chart-1", "--sheen-color-fg-muted", "--sheen-chart-grid"]);
c()["--sheen-chart-1"];   // resolved concrete color string
```

Implementation: one hidden probe per provider/scope, read on mount and effective theme-axis changes, batched into a single signal update. Observe effective `data-sheen-*` changes, including ancestor inheritance, and resolve concrete canvas-compatible values. The Loupe editor owns a last-appended `<style>` and explicitly calls a Loupe-only `invalidate()` after writes, rAF-batched. That hook is not part of the general application API. Components must not call `getComputedStyle` themselves.

### 5.9 Shipping themes

- **`obsidian`** — dark-first, near-black cool neutrals, jade accent. Default. §2 in full.
- **`paper`** — light, higher contrast, print-adjacent. Documents and reports.
- **`vellum`** — light, warmer, larger type, lower density. Reading-heavy surfaces.
- **`contrast`** — AAA text, strong controls and focus indicators, thick borders, no subtle tints.
- **`slate`** — cool blue-grey surfaces for monitoring and analytics.
- **`graphite`** — neutral grey surfaces with minimal color cast.
- **`studio`** — calm near-black or cool-white product surfaces, slightly airier content type, and Phosphor artwork for polished application shells.

All seven themes provide light and dark modes, with dark as the application default even for the light-oriented designs. All twelve accent presets are available through a picker, persisted at the root, and previewable side by side. Theme selection retains the selected accent. Generate and validate the supported theme × mode × accent matrix; failed combinations are build errors. CSS entry points allow consumers to ship only their selected themes and accents.

**Type:** one sans + one mono. Default IBM Plex Sans + IBM Plex Mono, OFL, real tabular figures, and less of a default tell than Inter + JetBrains. The font package contains the exact static 400/600 sans and 400 mono faces used by the tokens, with upstream revision, hashes, and license. Its optional display policy forbids a late font swap; apps that require Plex on first paint preload the emitted same-origin assets. Swap a paid mono per-theme by overriding `--sheen-font-mono` only. Enable `font-feature-settings: "tnum" 1` on all numeric contexts; tabular figures are non-optional in a data UI.

---

## 6. Application shell contract

This section is what makes apps feel like software rather than pages. These are hard requirements on any app built with `sheen`, provided by `AppShell` and enforced by lint where possible.

### 6.1 Fixed viewport

```css
html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }
```

The document never scrolls. Scrolling happens only inside designated `<ScrollArea>` panes. Chrome — sidebar, topbar, status bar, toolbars — is fixed and never scrolls with content.

Consequences that must be handled rather than ignored:

- Every scrollable region needs an explicit height constraint from its parent grid/flex chain. `AppShell` provides this.
- `position: sticky` becomes mostly unnecessary; use fixed chrome instead.
- Scroll restoration on navigation is per-pane, not per-document, and `AppShell` owns it.
- Mobile fallback: below the `md` breakpoint, allow document scroll and collapse the sidebar into a drawer. This is the one sanctioned exception.

### 6.2 Keyboard

A shortcut registry lives in `@gemologic/sheen`:

```tsx
useShortcut({
  keys: "mod+k",
  scope: "global",
  label: "Open command palette",
  group: "Navigation",
  run: () => palette.open(),
});
```

Requirements:

- **Scopes** — `global`, `view`, `pane`, `dialog`. Scopes stack; the innermost active scope wins. Opening a dialog pushes a scope and suspends those below.
- **Introspectable registry.** The command palette lists every registered shortcut. `?` opens a generated shortcut sheet grouped by `group`.
- **Tooltips show shortcuts.** `<Tooltip>` renders a string `shortcut` as a display-only `<Kbd>`. Passing a typed `ShortcutAction` to Button, Tooltip, or IconButton registers the native control action and lets tooltip controls surface the registry's platform-formatted binding automatically. Do not duplicate that action with `useShortcut`; reserve the hook for actions not owned by one control.
- **Sequences** — `g` then `i`, 1s timeout, visible pending indicator.
- **Never swallow browser shortcuts** the user needs (`mod+r`, `mod+l`, `mod+t`, `mod+w`).
- **Text inputs suppress single-key shortcuts** automatically; `mod`-prefixed ones still fire.
- **Character-only shortcuts are user-controllable.** Apps wire `ShortcutProvider.characterShortcuts` to a visible persisted setting. Turning it off disables both single characters and all-character sequences; Shift-produced printable characters still count, while any Ctrl, Meta, Alt, or non-printable stroke makes the binding non-character. The visible shortcut sheet remains available without its `?` binding.
- Platform-aware rendering: `mod` renders as `⌘` on macOS, `Ctrl` elsewhere.

M1 baseline bindings: `?` shortcut sheet, `mod+/` toggle sidebar, `esc` dismiss topmost layer, `mod+shift+d` cycle theme mode (development only). The palette registers `mod+k` in M2 when mounted.

Same-scope duplicate bindings throw in development naming both labels. Production uses last-registered wins with a warning; cross-scope shadowing is valid. Registrations clean up on owner disposal. Apps can export a runtime binding snapshot for `sheen doctor`; static analysis cannot enumerate all dynamic registrations.

### 6.3 Focus and selection

Three states are visually distinct and must never be conflated:

| State | Attribute | Treatment |
|---|---|---|
| Hover | `:hover` | `--sheen-color-bg-hover` |
| Keyboard focus | `data-focused` / `:focus-visible` | focus ring, no background change |
| Selected | `data-selected` | `--sheen-color-bg-selected`, persists without focus |

Lists, trees, menus, and table rows use **roving tabindex** — one tab stop for the collection, arrow keys move within it. Multi-select supports `shift+arrow` / `shift+click` for ranges and `mod+click` for discontiguous, matching platform conventions.

Dialogs trap focus, restore it on close, and are dismissible with `esc`. `Escape` unwinds exactly one layer.

### 6.4 Scrollbars

Overlay style: 8px, transparent track, thumb at `--sheen-color-fg-subtle` / 40% opacity, visible on hover or during scroll, fading after ~800ms idle. `scrollbar-width` / `scrollbar-color` where supported, `ScrollArea` (Kobalte) where consistency matters. Never a native chunky scrollbar in app chrome.

### 6.5 Loading and optimistic UI

- **No full-page spinners, ever.**
- Skeletons only on genuine cold load of a region that has never had data. Navigating between already-loaded views shows content immediately.
- Apps own optimistic data operations. Sheen supplies `data-pending`, undo/retry toasts, and an `optimistic(apply, commit)` helper whose app-supplied apply operation returns a revert callback; sheen owns no data cache or transport.
- Under 200ms, show no loading state at all — a flash of skeleton is worse than a brief pause.
- A thin indeterminate bar at the top of the affected pane is the sanctioned signal for operations over ~500ms.

### 6.6 Context menus

From M2, apps provide context menus for table rows, list items, tree nodes, tabs, and sidebar entries where appropriate. Actions include those reachable elsewhere with their shortcut hints. M1 provides integration mount points and prevents suppression without a replacement; native context menus remain available until an app mounts its menu.

### 6.7 Text selection

`user-select: none` on chrome — sidebar, toolbars, tab bars, table headers, buttons, menus. `user-select: text` on content — cell values, prose, code, form values. Getting this backwards is one of the loudest "this is a webpage" tells.

### 6.8 Window-level concerns

`AppShell` accepts an injected `router={{ location, navigate, block }}` adapter for navigation, pane scroll restoration, title sync, and URL state. Ship a Solid router adapter in M1 and a TanStack Router adapter in M2. `useUnsavedChanges(() => boolean)` registers app-owned dirty state; AppShell supplies `beforeunload` and router blocking.

Connection state is app-owned: `StatusBar` renders a `connection` prop. `useOnlineStatus()` is an optional convenience and never auto-wired; browser connectivity is not backend health. `useIsWindowFocused()` lets apps pause polling. Ship English UI messages with provider overrides and explicit context locale for all `Intl` date/number formatting.

### 6.9 Refresh continuity

Existing content remains mounted and visible during background refresh; mark the affected region `aria-busy`/`data-pending` without swapping it for a skeleton. Requests that supersede earlier requests cannot allow late responses to overwrite current state. Apply accepted changes atomically using stable identities, preserving focus, text selection, pane position, expanded rows, and dirty edits where their targets remain. If a target is removed, move focus to a documented nearest surviving target.

Cold load may use a size-matched skeleton after 200ms. A refresh over 500ms shows the pane progress bar; a failed refresh retains existing content with a non-blocking error and retry. An explicit user dataset/page change may replace content once the new result arrives; while pending, clearly identify retained rows as the previous result and disable operations that would mistakenly treat them as the new query. Account/permission boundaries must clear unauthorized content immediately and never reuse another user’s cached view.

Tests must detect intermediate blank frames and unwanted remounts, not only compare final screenshots. Theme/accent changes update CSS and charts without remounting controls. Background updates do not restart mount animations or discard editor drafts.

### 6.10 Admin application composition

`AppShell` remains the low-level owner of fixed viewport geometry, pane scrolling, navigation blocking, and responsive shell behavior. `AdminApp`, exported from `@gemologic/sheen-patterns/admin`, is the opinionated brand baseline built on it. It defaults to comfortable density and supplies a complete application composition: topbar, optional sidebar, main pane, optional status bar, contextual overlay host, command palette, toast provider, confirm-dialog service, and optional details panel. Dense work surfaces opt in locally instead of shrinking the entire shell.

Applications own identity, authorization, navigation data, account data, notification data, connection health, and transport. Sheen renders those values and interactions but never authenticates, fetches them, or installs an application data store. General modal content remains declarative through `Dialog`; the shell does not expose a global arbitrary-content modal manager.

#### Semantic chrome zones

Structural customization is placement within a constrained semantic grammar, not arbitrary shell markup. `AdminApp` accepts models or slots for:

- product identity and workspace switcher;
- primary and secondary navigation;
- current-view label or breadcrumb;
- command trigger and global search;
- primary, utility, notification, help, and account actions;
- page content, status, and contextual details.

The layout configuration places each eligible zone in a supported target such as `topbar-start`, `topbar-center`, `topbar-end`, `sidebar-header`, `sidebar-navigation`, or `sidebar-footer`. Primary navigation may be vertical in the sidebar or horizontal in the topbar. Account and workspace controls may live in either the topbar or sidebar footer/header; their menu direction and alignment derive from placement, so a sidebar-footer account menu opens upward when space requires it. Action groups use semantic roles and bounded placements rather than a generic bag of buttons.

Ship named presets as ordinary validated configurations:

- `standard`: sidebar navigation, workspace at sidebar start, account in a sidebar-footer drop-up;
- `workspace`: sidebar navigation with workspace and account in the sidebar, global actions in the topbar;
- `horizontal`: primary navigation and account in the topbar, with no sidebar unless secondary tools require it;
- `inspector`: sidebar navigation plus the responsive details panel.

Consumers may override individual placements without forking a preset. Presets never change tokens, focus behavior, landmark names, keyboard order, overflow policy, or responsive rules. Exactly one DOM instance owns each semantic zone. Placement is deterministic server input, not a client-only preference that rearranges chrome after hydration.

#### Brand appearance

Structure and brand styling are independent. `AdminApp.appearance` has three semantic axes: `chrome` (`layered`, `unified`, `tonal`), `navigation` (`subtle`, `accent`, `indicator`), and `actions` (`quiet`, `outlined`, `accent`). The default remains the restrained layered/subtle/quiet baseline. These values describe surface relationships and emphasis, not literal palette values, so they compose with every supported theme, mode, and accent.

Applications use the root or enclosing theme for their full palette and independently select any bundled or private accent. AdminApp publishes documented `--sheen-admin-color-*` aliases for exact topbar, sidebar, content, details, status, navigation-hover, and navigation-active surfaces. A class may redeclare those aliases for a branded product without changing DOM structure or reaching into component selectors. Literal overrides carry the same AA text, 3:1 required-boundary, and two-part focus qualification obligations as a compiled private theme.

#### Sidebar and responsive behavior

The sidebar supports grouped/nested navigation, active-route matching, badges, keyboard navigation, expanded and collapsed icon-rail modes, and a mobile drawer. Collapse is controlled or uncontrolled. Persistence is explicit: an application may provide a server-resolved initial preference and persistence callback, but `AdminApp` never reads localStorage after hydration and shifts the layout. The scaffold demonstrates cookie-authoritative persistence.

`DetailsPanel` is docked and optionally resizable on wide screens and uses a right-side `Sheet` presentation on narrower screens. It supports controlled or URL-backed identity. The server emits complete deterministic content; responsive presentation must not duplicate or replace the panel's accepted content during hydration. Closing or changing the panel restores focus to a surviving origin.

Navigation, account, action, and panel placement collapse into a documented mobile order. Every visual reordering has the same logical reading and keyboard order. Layout changes in the Loupe Composer may rebuild its isolated preview, but production `AdminApp` configuration is stable for the lifetime of the mounted shell.

---

## 7. Component authoring conventions

### 7.1 Solid correctness

1. **Never destructure props.** `const { size } = props` permanently breaks reactivity. Use `splitProps` / `mergeProps`.
2. **No `forwardRef`.** `ref` is a normal prop in Solid.
3. `class`, not `className`. Always accept and merge via `cn()`.
4. `props.children`; use the `children()` helper when children resolve more than once.
5. Spread the remainder onto the root element so consumers can pass ARIA and data attributes.
6. No `getComputedStyle` in components — §5.8 is the only exception.

### 7.2 API shape

- `class` merges last so consumers can always override.
- State is exposed as `data-*` attributes (`data-state="open"`, `data-selected`, `data-invalid`) and styled with `data-[state=open]:` variants. Never conditional class strings.
- Three standard variant axes: `size` (`xs|sm|md|lg`), `variant` (visual treatment), `tone` (semantic color). Not every component needs all three.
- Polymorphic via the wrapper’s `SheenPolymorphicProps` seam only where necessary. URL changes use `Link`; actions use `Button`. A button-styled link is `<Link variant="button">`, while an action with link styling is `<Button variant="link">`.
- Export a typed class recipe so `patterns` and apps can compose against it without importing a styling dependency.

### 7.3 Reference implementation

```tsx
// packages/ui/src/primitives/Button.tsx (abridged)
type ShortcutAction = {
  keys: string;
  scope?: string;
  label: string;
  group: string;
  developmentOnly?: boolean;
};

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {
  loading?: boolean;
  shortcut?: ShortcutAction;
}

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ["class", "variant", "tone", "size", "loading", "disabled", "shortcut", "ref", "children"]);
  let element: HTMLButtonElement | undefined;
  const binding = useShortcutAction(() => local.shortcut, () => {
    if (!local.disabled && !local.loading) element?.click();
  });
  return <button {...others} ref={element => { /* preserve the caller ref */ }}
    type={others.type ?? "button"}
    class={cn(buttonVariants(local), local.class)}
    data-sheen-shortcut={binding()?.displayKeys}
    disabled={local.disabled || local.loading}
    aria-busy={local.loading || undefined}>{local.children}</button>;
}
```

The sketch illustrates variant composition; implementation must export the type seam as `SheenPolymorphicProps`, use per-tone contrast-validated solid foregrounds, and suppress loading/disabled activation through keyboard and shortcut paths as well as pointer paths. Metadata examples must compile against the implemented API. The default visual variant is `ghost`; solid accent actions are rare (§2.1).

### 7.4 Per-component files

```
Button/
├── Button.tsx
├── Button.meta.ts     # manifest source (§13.1)
├── Button.demo.tsx    # loupe demos + controls schema
├── Button.test.tsx
└── index.ts
```

---

## 8. Component inventory

Components use milestone labels directly (§16). Deferred inventory is demand-driven and outside v1.

### Primitives

Button, IconButton, ButtonGroup, Link, Text, Heading, Code, Kbd, Badge, Tag, Icon, Spinner, Skeleton, Separator, Surface, Card, Alert, Callout, Tooltip (with `shortcut`) — **M1**.
Avatar, AvatarGroup, Progress, Meter — **M2**.

### Forms

Field (label / description / error wrapper), Input, InputGroup, Textarea (autosize), Checkbox, CheckboxGroup, RadioGroup, Switch, Select, SearchInput — **M1**.
NumberField, Combobox, MultiCombobox, Slider, RangeSlider, SegmentedControl, TagInput, FileDropzone, Formisch validation adapter (`@formisch/solid`) — **M2**.
Calendar, DateField, TimeField, DatePicker, DateRangePicker, TimePicker, DateTimePicker, TimeZoneSelect (`@gemologic/sheen-date`, Ark UI plus `@internationalized/date` internally) — **M2**.
OTPField (corvu), TreeSelect, ColorPicker, TransferList — **Deferred**.

Text-like fields ship an `editable` variant in M2. At rest render a focusable `<span tabindex="0">`; focus, click, or Enter activates a real input. Editing is uncontrolled locally: blur or Enter commits, Escape reverts. Forms read committed state, not resting DOM. Validation leaves the editor active with `data-invalid`; table async failures follow §10.4.

Combobox values are committed option IDs, never free-form query text. `Combobox` accepts one ID or null; `MultiCombobox` accepts an ordered unique ID list and renders removable tags. Option IDs and labels are nonempty and IDs are unique. The app owns debounce, AbortSignal, monotonic request tokens, transport, and result acceptance. It sets `pending` before starting a request and replaces `options` only with a coherent accepted result; the component keeps the previous accepted option nodes mounted and temporarily non-selectable until then. `filter={false}` selects app-owned filtering, while the built-in modes filter a complete supplied option set. Result errors retain accepted results and are distinct from field validation.

Both variants emit explicit label/description relationships in SSR markup, preserve native input drafts through hydration, and mount their listboxes in the nearest theme portal. Selected values remain resolvable from previously seen options when an external filter excludes them. Single selection uses a hidden native select; multiple selection owns an equivalent native multi-select projection so every committed value submits. Multi-select query input is never the required form value.

Date and time components expose Sheen-owned serializable values rather than JavaScript `Date`, Ark, or Adobe types. A calendar date has no implicit timezone; a time is a local wall-clock value; a date-time that denotes an instant carries an explicit IANA timezone and defined ambiguous/nonexistent-time handling. Locale and calendar preferences change parsing, presentation, and calendar interaction without silently changing the stored value. Native form projections submit documented ISO representations. All popup selectors inherit the nearest theme portal and retain drafts, focused segments, and accepted values across hydration and background option refresh.

### Overlays

Dialog, AlertDialog, Popover, DropdownMenu (nested / checkbox / radio items, shortcut hints), Toast + Toaster — **M1**.
ContextMenu, Drawer/Sheet (corvu, 4 sides), CommandPalette (cmdk-solid) — **M2**.
HoverCard — **Deferred**.

All overlays scale-and-fade from origin, 120ms, `--sheen-elevation-overlay`. No backdrop blur by default — expensive and reads as decorative.

### Navigation

Tabs, Breadcrumb, NavList / NavItem, Collapsible / Accordion — **M1**.
ScrollArea and the shell-specific mobile drawer — **M1**.
Pagination, general Resizable panes (corvu), and Stepper — **M2**.

### Data display

Table (styled primitives), EmptyState, DescriptionList — **M1**.
DataTable (§10), CodeBlock (Shiki), Tree — **M2**.
Stat / StatGroup — **M3**.
ActivityTimeline — **M2**.
DiffViewer, LogViewer, JSONViewer — **M4**.

`CodeBlock` keeps rendering separate from optional Shiki highlighting and adds an optional filename/header, copy action, wrapping toggle, language display, and highlighted-line ranges. `DiffViewer`, `LogViewer`, and `JSONViewer` use separate `@gemologic/sheen-code/*` entries so importing the basic renderer never pulls parsers, formatters, or virtualized viewers.

### Layout primitives

Stack, Row/Cluster, Grid, Container, Center, Spacer — **M1**. Thin, token-aware wrappers whose purpose is to stop agents inventing arbitrary spacing.

### Patterns

The package that actually makes apps look like siblings. Prioritize it.

| Pattern | Phase | Notes |
|---|---|---|
| AppShell | M1 | Fixed-viewport grid, sidebar + topbar + content + status bar, §6 contract at its assigned milestones |
| SidebarNav | M1 | Sections, nesting, active-route matching, badges, collapsed icon mode, keyboard nav |
| AdminApp | M2 | Opinionated compact shell over AppShell with semantic chrome zones, presets, overlay services, and placement-safe customization |
| AdminTopbar / TopNav | M2 | Product/workspace identity, horizontal navigation, command trigger, global actions, notifications, and account placement |
| AccountMenu / WorkspaceSwitcher | M2 | App-owned identity models rendered consistently in topbar or sidebar placements |
| DetailsPanel | M2 | Responsive docked/resizable detail region that becomes a right Sheet without content replacement |
| NotificationCenter | M2 | App-owned notification model with badge, popover/panel presentation, and accessible announcements |
| PageHeader | M1 | Title, breadcrumb slot, actions slot, tabs slot. Compact — 44px, not a hero. |
| Toolbar | M1 | Segmented groups, overflow menu, filter slot |
| StatusBar | M1 | Connection state, background task indicator, counts |
| ErrorState / LoadingState | M1 | 404 / 500 / permission-denied; skeletons matching each layout |
| ConfirmDialog | M1 | Imperative `confirm()` helper |
| Toaster mount | M1 | Bottom-right, quiet, stacked, undo affordance |
| ListDetailLayout | M2 | Master list + detail pane, keyboard-navigable, URL-driven |
| DataTablePage | M2 | Toolbar + FilterBar + DataTable + selection action bar |
| SettingsLayout | M2 | Nav rail + section groups + save bar |
| CommandPalette provider | M2 | Registerable command sources, fuzzy, recents, scoped |
| SplitLayout | M2 | Resizable panes with persisted sizes |
| QueryBuilder | M4 | Structured editor over the table filter AST, with keyboard-complete group and rule operations |
| AuthLayout / FocusedAuthLayout / BrandSplitAuthLayout | M2 | Deterministic authentication frame plus focused OIDC and responsive brand-split starters; applications own authentication, provider transport, errors, redirects, and sessions |

---

## 9. Motion

Short section because the rules are short, and violating them is the fastest way to lose the OS feel.

- Durations: `fast` 100ms (hover, focus, color), `normal` 150ms (overlays, expand/collapse), `slow` 250ms (panel slides, drawer). Nothing exceeds 250ms.
- Easing: `standard` `cubic-bezier(0.2, 0, 0, 1)`, `entrance` `cubic-bezier(0, 0, 0, 1)`, `exit` `cubic-bezier(0.3, 0, 1, 1)`. No springs, no bounce, no overshoot.
- Animate transform, opacity, and color. Expand/collapse may additionally use `grid-template-rows: 0fr → 1fr`; do not animate physical dimensions or offsets.
- Layout content never animates on mount or route change. Transient layers, including toasts, popovers, and the selection action bar, animate on enter/exit as feedback for the action that created them.
- Overlays: `opacity 0→1` plus `scale 0.96→1` from a transform origin at the trigger, 120ms.
- List reorder and drag get motion; list render does not.
- Every animation is a no-op under `[data-sheen-motion="reduced"]`.

---

## 10. DataTable

`@gemologic/sheen-table`. Sheen owns table state, processing, and lazy row projection; TanStack Virtual owns viewport realization; `sheen` primitives own chrome. Production profiling rejected a second general-purpose row-model layer because wrapping all 100,000 rows duplicated work already owned by Sheen. The public column and table contracts remain engine-independent.

### 10.1 Capabilities

**Data**
- Client mode (in-browser processing) and server mode (delegated requests) share sheen state and columns. Server mode additionally requires the request callback and explicit pagination configuration (§10.4–§10.5).
- Row grouping with collapsible section headers and per-group aggregates.
- Tree/hierarchical rows with expand/collapse, and async loading for expanded subtrees.

**Search and filter**
- Global smart search across configured columns, debounced and ranked. An opt-in visible match-mode control and leading `'` syntax disable fuzzy ranking and match a case-insensitive literal phrase contained within one searchable column, without a second persisted state field. Strict whole-cell equality remains a typed column filter. Small custom matcher; no heavyweight dependency. Arbitrary regular expressions are not executed on the client unless a future linear-time matcher is explicitly qualified.
- Search participation is explicit per column through `search: true` or a search-text projection. Hidden, action, numeric, or sensitive values are not searched merely because a column has an accessor.
- **FilterBar** — the chip UI. Each active filter is a removable pill (`Status is Open, In Review`) whose editor is a popover appropriate to the column type: multi-select for enums, comparison operator plus input for numbers, range picker for dates, match mode for strings. `+ Filter` opens a searchable column picker.
- The filter model is a serializable AST supporting `and`/`or` groups, per-column operators, and negation. It round-trips to the URL query string and to saved views.
- Faceted counts: enum filter popovers show a count per option, computed from the current dataset in client mode or supplied in server mode.

**Columns**
- Sort: single and multi (`shift+click`), three-state cycle, indicator with sequence number when multi.
- Resize (drag, double-click to auto-fit), reorder (drag), pin (start/end), show/hide via a column menu.
- Per-column alignment, formatter, and cell renderer. Numeric columns default to tabular figures and end-alignment.
- Sizing modes: fixed, fill, content-fit.

**Rows**
- Virtualized always. Fixed row height by default (`--sheen-table-row-h`, density-aware); variable height supported with measurement.
- Selection: checkbox column, `shift+click` range, `mod+click` discontiguous, select-all / select-page, `mod+a` within the table scope.
- Keyboard: roving focus by row, `arrow` to move, `shift+arrow` to extend, `enter` to open, `space` to toggle selection, `home`/`end`, `pgup`/`pgdn`.
- Right-click context menu per row, mirroring the selection action bar.
- Inline cell editing where a column declares an editor; `tab` moves between editable cells, `esc` cancels, `enter` commits.

**Chrome**
- Two presentations share one engine: `integrated` is borderless and fills an application pane; `framed` is a self-contained surface. Standalone tables default to framed, while `DataTablePage` and `AdminApp` default to integrated.
- Integrated tables own one compact table toolbar. Global search appears when searchable columns exist; filters, column controls, and export appear only when their underlying capabilities exist. `search={false}` is the explicit opt-out. Framed tables opt into search/filter chrome.
- Selection action bar: appears at the bottom of the table when rows are selected, showing count and bulk actions. Overlays; does not push layout.
- Sticky header, optional sticky footer with aggregates.
- Empty, loading (skeleton rows, cold load only), error, and no-results-for-filter states — the last is distinct from empty and offers a clear-filters action.
- CSV/JSON export of the current view, respecting filters, sort, column visibility, and selection.
- Saved views: named snapshots of filter + sort + column state. Sheen owns serialization; the app owns per-user persistence through a `views: { list, save, delete }` adapter. No localStorage default.
- Saved-view chrome is one compact switcher. Save, rename, delete, retry, and other management actions live in its menu/dialog instead of occupying the primary toolbar.

### 10.2 API sketch

```tsx
<DataTable
  data={orders()}
  columns={columns}
  getRowId={(r) => r.id}
  mode="client"                         // server mode supplies onStateChange
  variant="framed"                     // integrated inside DataTablePage/AdminApp
  pagination={false}                    // or { pageIndex: 0, pageSize: 50 }
  search={{ placeholder: "Search orders" }} // false disables automatic integrated search
  rowHeight="var(--sheen-table-row-h)"
  selection={{ mode: "multiple", onChange: setSelected }}
  grouping={{ by: "status", collapsible: true }}
  urlState="table"                      // serializes to ?table=...
  onRowActivate={(row) => nav(`/orders/${row.id}`)}
  contextMenu={(rows) => <OrderRowMenu rows={rows} />}
  bulkActions={(rows) => <OrderBulkActions rows={rows} />}
/>
```

Column definitions accept sheen-owned fields and produce opaque branded values. The typed, lint-warned `__unsafe_tanstack` field remains the explicit compatibility seam for a separately qualified adapter; the core renderer does not depend on it:

```ts
const columns = defineColumns<Order>([
  { id: "symbol", header: "Symbol", accessor: (r) => r.symbol,
    width: 120, pin: "start", search: true, filter: { type: "text" } },

  { id: "side", header: "Side", accessor: (r) => r.side,
    width: 80, cell: (v) => <SideBadge value={v} />,
    filter: { type: "enum", options: ["buy", "sell"], faceted: true } },

  { id: "pnl", header: "P&L", accessor: (r) => r.pnl,
    width: 110, align: "end", numeric: true,
    cell: (v) => <MarketValue value={v} />,      // uses --sheen-color-market-*
    filter: { type: "number" }, aggregate: "sum" },
]);
```

### 10.3 Performance targets

- 100,000 rows client-side: initial render under 200ms, scroll at 60fps with no blank frames.
- Sort on 100k rows: under 100ms.
- Filter-as-you-type on 100k rows: under 50ms per keystroke, debounced 120ms.
- Global ranked search on the committed 100k-row fixture: under 50ms compute time after the configured debounce.
- Column resize drag: 60fps with no full re-render — resize via a CSS custom property, not by re-rendering cells.
- Cell renderers must be cheap. Document this and provide a `memoCell` helper.
- No layout thrash on scroll: fixed row heights, `content-visibility: auto` on off-screen groups, `contain: strict` on the viewport.

---

### 10.4 State, requests, selection, and edits

Client/server data processing and pagination are independent axes. Client mode transforms the complete supplied dataset; server mode delegates filtering, sorting, grouping, facets, and pagination together. Never sort/filter a single server page locally and imply it covers all matches.

Server requests use `onStateChange(state, signal) → Promise<{ rows, total, facets? }>`. Supply an AbortSignal and track a monotonic token; abort superseded work and discard older responses even when abort is ignored. Retain accepted rows during revalidation (§6.9), expose errors/retry, and never clear rows merely because a request starts. Apps enforce authorization independently of URL/filter state.

Explicit selection retains IDs across pages, originating only from loaded rows. Inverted selection captures an immutable filter AST plus exclusions. Bulk actions receive `{ kind: "ids", ids }` or `{ kind: "query", filter, excluded }`. Changing filters clears selection by default. Never fetch all server pages to materialize selection.

Client export uses the in-memory filtered/sorted view, visible columns, and selection. Server export requires `onExport`; hide export without it. Saved views use app-supplied `views: { list, save, delete }`. Export versioned `serializeState`/`deserializeState`; validate malformed state, unknown versions, and column references with actionable errors. Adapter failure preserves current state and offers retry. URL state uses the injected router.

`onCellCommit` returns a promise. Validation failure keeps editing active and invalid. Transport failure reverts the displayed committed value, preserves the failed draft for retry, flags the cell, and shows a retry toast. Dirty drafts survive refetch with `data-stale`. Identify commits per cell and ignore superseded completions; apps report explicit version conflicts that remain visible until retry or discard. Retry cannot overwrite a newer draft.

### 10.5 Pagination and continuous tables

Virtualization applies to desktop tables with pagination enabled or disabled. It bounds DOM work, not network transfer or memory.

- `pagination={false}`: continuously scrollable virtualized results with no page controls, the client default for bounded data. Server mode must return the complete bounded matching result with `rows.length === total`; reject partial results as incomplete. Never automatically walk server pages.
- `pagination={{ pageIndex, pageSize }}`: zero-based pages with positive integer size. Client mode slices after filtering/sorting; server mode returns the requested page and matching total. Server mode requires explicit pagination configuration, including explicit `false`.
- Use server pagination for large/expensive remote results and continuous client mode for bounded supplied data. There is no universal row-count cutoff; payload size, row width, processing cost, and interaction needs decide.
- Filter, sort, or page-size changes reset to page zero. Deletions that invalidate the page clamp and request the last valid page. Empty results settle at page zero without request loops.
- Page controls support keyboard interaction and announce accepted results. Distinguish select-page from select-all-matching. Accepted page changes scroll to the first row; same-query refresh preserves the scroll anchor.
- Keep previous rows during page requests, visibly identify them as previous results, and prevent operations against the pending page. Failure retains the accepted page with retry.
- Phone `mobileLayout` is opt-in and uses cards with equivalent selection, sorting, row activation, visible overflow actions, field rendering, and footer values. Continuous results receive a presentation-local numbered page, default 20 and hard-capped at 100 cards; this page does not change query state, export scope, or the meaning of `pagination={false}`. Already-numbered tables render the one accepted client/server page and reuse its existing pagination controls, never a second local page. The server and client render the same bounded table-plus-card markup and CSS selects the presentation below 768px, so no `matchMedia` branch can replace content during hydration. Card roots are retained through hydration and refresh; pending server work keeps accepted cards opaque, disables actions, and uses the same delayed refresh status as the desktop table. Visible overflow actions remain available while native phone long-press behavior is left intact. It must never mount 100,000 cards.

Continuous display does not imply infinite fetching. Cursor-based infinite loading is a separate deferred adapter. Complete bounded results and numbered pagination are supported in v1.

### 10.6 Presentation and toolbar ownership

Density and chrome are independent. The table inherits the effective theme density by default, or `density="compact" | "comfortable" | "spacious"` establishes a table-local density for its inline chrome and rows. Application shells should generally stay comfortable and opt dense work surfaces into compact locally. `variant="integrated"` removes the outer surface border/radius and joins the table toolbar, header, viewport, footer, and pagination into one pane. `variant="framed"` retains a distinct surface for embedding outside application layouts.

DataTable owns search, active filter chips, filter creation, columns, export, density-sensitive table actions, result counts, and selection chrome. `DataTablePage` owns the page title, breadcrumb, tabs, page-level actions, and regional loading/error state. The two layers must never render duplicate toolbars.

The public search configuration supplies its accessible label, placeholder, debounce, optional shortcut, and optional exact-match mode. Exact means one normalized literal phrase contained within a single searchable column; it does not perform strict whole-cell equality or split terms across columns. The mode is encoded by a leading apostrophe in the search string, and doubled apostrophes escape a literal prefix, so the mode round-trips without changing the versioned `TableState`. It publishes through the same accepted `TableState` and transition path as filtering and sorting; server search therefore receives AbortSignal and monotonic stale-response protection automatically. Server adapters use the exported parser to apply the same mode. Search state round-trips through URL state and saved views and affects export and inverted selection query snapshots.

Do not introduce a worker-only column contract in the initial optimization pass. Profile real production builds, then optimize normalized search projections, comparison keys, indexes, reactive fan-out, and cell computation. A future worker adapter is justified only if those measures cannot satisfy interaction gates without requiring accessors or renderers to cross the structured-clone boundary.

## 11. Charts

`@gemologic/sheen-charts`. Two engines, one themed API.

### 11.1 Engine selection

| Engine | Use for | Why |
|---|---|---|
| **uPlot** (canvas) | Time series, streaming, anything over ~2,000 points: metrics and latency over time | ~45KB, renders 100k+ points in single-digit milliseconds. Nothing SVG-based is close. |
| **Hand-rolled SVG** on `d3-scale` + `d3-shape` | Categorical and statistical charts under ~2,000 marks: bar, stacked/grouped bar, donut, scatter, heatmap, box plot | ~15KB for a fixed vocabulary, full token control, crisp at any DPI, accessible via real DOM nodes. |
| **Inline SVG path, no library** | Sparklines, inline trend indicators | Under 1KB. A sparkline should never pull in a chart engine. |

Do not add a third engine. If a chart type isn't in the vocabulary, either extend the SVG layer or don't build it.

### 11.2 Chart types

**M3:** `LineChart`, `AreaChart`, `BarChart` (grouped, stacked, horizontal), `Sparkline`, `TimeSeries` (the uPlot wrapper), `Stat` with trend.
**Deferred:** `ScatterChart`, `Heatmap`, `Donut`, `Histogram`, `BoxPlot`.

### 11.3 Shared API

```tsx
<TimeSeries
  label="API latency"
  summary="Latency declined after the deployment; one sample is missing."
  xLabel="Time"
  series={[
    { key: "p50", label: "p50", color: "chart-1", encoding: "solid" },
    { key: "p99", label: "p99", color: "chart-3", encoding: "dashed" },
  ]}
  data={metrics()}                 // columnar: { t: Float64Array, p50: Float64Array, ... }
  x={{ type: "time", tz: "America/New_York" }}
  y={{ format: "duration", zero: false }}
  height={220}
  cursor={{ sync: "latency-group" }}   // crosshair synced across a chart group
  legend="inline"
  annotations={[{ x: deployAt, label: "deploy", tone: "warning" }]}
  onZoom={setRange}
/>
```

Time-indexed charts take a required `label`, narrative `summary`, `xLabel`, `series`, `data`, `x`/`y` config, and `height`, with optional `legend`, `tooltip`, `annotations`, `empty`, and `loading`. `BarChart` replaces the numeric/time X-axis contract with required `categoryLabel`, `valueLabel`, and `ChartCategoricalData`, plus `layout` and `arrangement`. Full charts always expose the bounded native-table alternative from §11.6; `table` configures its page size and disclosure label but does not disable it. Colors are referenced by **token name** (`"chart-1"`, `"market-up"`, `"accent"`), never by literal value. Series may explicitly select `solid`, `dashed`, `dotted`, or `dash-dot` encoding; the deterministic index-based default is supplementary, while repeated palette colors require an explicit non-color encoding.

**Columnar data.** Use equal-length `Float64Array` columns. Timestamps are finite, strictly increasing UTC milliseconds since epoch; duplicate/unordered timestamps are errors. `tz` changes formatting only. Values are finite or `NaN`: gaps break lines, terminate area fills, and show an em dash in tooltips. `undefined` and infinities are errors. `toColumnar()` converts and validates row-oriented data with descriptive errors. Validate new batches without rescanning unchanged history per frame. `chart.__unsafe_uplot` is the explicit typed, lint-warned escape hatch.

**Categorical data.** `ChartCategoricalData` contains an ordered array of unique, nonempty `categories` plus an equal-length `Float64Array` in `values` for every declared series. `toCategorical()` converts and validates row data; `validateCategorical()` applies the same exact-key, length, finite-or-`NaN` boundary to prebuilt columns. Categories are not encoded as timestamps or numeric indices in the public data model. Grouped and stacked bars support vertical and horizontal layout, accumulate positive and negative stacks separately, and omit `NaN` bars while preserving missing values in the native table.

### 11.4 Theming

- The categorical palette is `--sheen-chart-1` .. `-8`, theme-defined, ordered by perceptual distinctness and qualified under the adjacent-pair policy in §5.6. The all-pairs and achromatopsia audit remains visible because qualification does not mean every arbitrary pair is distinguishable by color alone. Charts use a non-color encoding for any essential series distinction, and charts needing more than 8 series use a different encoding rather than extending the palette.
- Canvas charts resolve colors through `useThemeTokens()` (§5.8) and redraw on theme, mode, or density change. **This must be tested** — a chart keeping its dark colors after switching to `paper` is the canonical bug here.
- Grid, axis labels, and crosshair use `--sheen-chart-grid`, `--sheen-color-fg-muted`, `--sheen-chart-crosshair`. Axis labels use `text-caption` with tabular figures.
- Financial series use `--sheen-color-market-up/down/flat`, not the categorical palette (§4.4).
- **Grid restraint:** horizontal gridlines only by default, at roughly 6% foreground. No chart border, no background fill, no axis spines. The data should be the highest-contrast thing in the frame.

### 11.5 Streaming

`useStreamingSeries({ capacity, interval })` requires positive integer capacity and maintains a preallocated typed-array ring buffer. Drop oldest on overflow and retain the newest capacity samples. Expose `dropped` for samples displaced before presentation; normal eviction of already-presented history is not a producer-drop event. Reject out-of-order samples and expose a separate rejected-sample counter. Invalid input has descriptive diagnostics. Coalesce uPlot updates on rAF, never block producers or allocate on append, and dispose scheduling with the owner. Counters have no default visual indicator.

### 11.6 Interaction

Crosshair with synced tooltip across a chart group; drag-to-zoom on X with double-click to reset; series toggling from the legend; and a keyboard-accessible data table behind a native "view as table" disclosure. Canvas charts get the required narrative summary as their accessible label and always compose the table escape hatch. The table mounts at most 50 rows by default and paginates the already-present columnar snapshot, with a configurable hard maximum of 200 rows per page, so the 100k-point performance case never creates 100k DOM rows. It includes every declared series even when visually hidden, preserves `NaN` as a visible em dash plus localized missing-value text, formats through the provider locale, defaults omitted timezones to UTC, and treats `tz` as formatting-only.

### 11.7 Performance targets

- 100k points, 4 series: initial draw under 16ms, pan/zoom at 60fps.
- Tooltip hover causes **zero** Solid re-renders — crosshair and tooltip draw on a separate overlay layer.
- Streaming at 60 updates/sec sustained without frame drops.
- `Sparkline` under 1KB and under 0.5ms per render.
- Theme switch redraw across 20 on-screen charts: under 50ms total.

---

## 12. Icons

### 12.1 The problem

Linear's icons are custom, drawn for 16px. Most open sets (Lucide, Tabler, Feather) are drawn on a 24px grid at 2px stroke; scaled to 16px they land off-pixel and read heavy. 16px is the most common size in a dense app, so this matters more than it sounds.

### 12.2 Approach

**Build-time inlining via Iconify.** The sheen Vite integration resolves literal semantic names to inline SVG; CSS switches among bundled sets. No runtime fetching. Only explicit `DynamicIcon` needs a runtime registry. Supported sets are Radix and Phosphor.

Sets:
- **Radix Icons** for UI chrome — drawn natively at 15px, geometric, crisp small, closest in spirit to Linear's marks. ~300 icons, which covers most chrome.
- **Phosphor** (`light` or `regular` weight) for the long tail — ~1,500 names, weight-adjustable, good small-size behavior.
- Nothing else. Two sets is already one more than ideal.

### 12.3 Semantic registry

Apps never reference icon set names. `sheen` maps role names to concrete icons, which makes icons themeable and swappable:

```ts
// packages/icons/src/registry.ts
export const registry = defineIconRegistry({
  settings:    { radix: "gear",              phosphor: "gear-six" },
  search:      { radix: "magnifying-glass",  phosphor: "magnifying-glass" },
  close:       { radix: "cross-2",           phosphor: "x" },
  chevronDown: { radix: "chevron-down",      phosphor: "caret-down" },
  filter:      { radix: "mixer-horizontal",  phosphor: "funnel" },
  // ...
});
```

```tsx
<Icon name="settings" size="md" />
```

Icon sets are selected at build time. When bundled themes declare different sets, inline both SVG variants for each statically used semantic name and switch with `[data-sheen-icon-set]`. Support at most two sets per bundle. Unknown literal names are build errors. A Vite integration transforms literal `<Icon name>` references; other build systems can use explicit per-icon imports. Dynamic names warn via `no-dynamic-icon-name`; intentional `<DynamicIcon>` usage pulls the complete runtime registry and documents that bundle cost.

### 12.4 Rules

- Sizes come from tokens: `sm` 14px, `md` 16px (default), `lg` 20px. Never arbitrary pixel sizes.
- Icons inherit `currentColor`. At rest they use `--sheen-color-fg-muted` — not `fg`, and never `accent` (§2.1 accent scarcity).
- Optical alignment: icons inside buttons get a small negative inline margin so the visual gap matches the text gap.
- Decorative icons get `aria-hidden`; meaningful ones require a `label` prop, enforced by lint. Icon-only buttons require a tooltip, enforced by lint.
- **Custom marks:** the ~40 highest-frequency actions in your apps are where a real identity lives. Once the system is in use, drawing a custom 16px set for those — 16px grid, 1.25px stroke, half-pixel aligned — is a tractable weekend and the highest-leverage visual work available. Reserve `--sheen-icon-set: "sheen"` for it. Out of scope for v1.

---

## 13. Agent integration

Prose style guides decay and get ignored. What works is machine-readable context plus a failing feedback loop.

### 13.1 Manifest

`sheen.manifest.json` is generated from colocated `*.meta.ts` for 100% of exported components. Exhaustively validate props against actual TypeScript types via ts-morph. Missing metadata or prop drift fails CI. Require at least one example per component; extract and typecheck every example. This is what prevents doc drift — a hand-maintained props table is stale within a month, and then agents confidently emit APIs that no longer exist.

Components eligible for the Loupe Composer add validated `composer` metadata: allowed parent regions, accepted child regions, editable safe props, deterministic fixture factory, and code-generation adapter. Eligibility is opt-in. The general manifest must not imply that every component can be meaningfully dragged into every layout.

```ts
// Button.meta.ts
export default defineMeta({
  name: "Button",
  package: "@gemologic/sheen",
  category: "primitives",
  summary: "Triggers an action. Use Link for navigation.",
  props: {
    variant:  { type: "enum", values: ["solid","soft","outline","ghost","link"], default: "ghost" },
    tone:     { type: "enum", values: ["neutral","accent","danger","success"], default: "neutral" },
    size:     { type: "enum", values: ["xs","sm","md","lg"], default: "md" },
    loading:  { type: "boolean", default: false },
    shortcut: { type: "string", description: "Registers a shortcut and shows it in the tooltip." },
  },
  tokens: ["--sheen-button-radius", "--sheen-control-h-*", "--sheen-color-accent"],
  a11y: { role: "button", keyboard: ["Enter", "Space"] },
  examples: [
    { title: "Default (quiet)",  code: `<Button>Cancel</Button>` },
    { title: "Primary action",   code: `<Button variant="solid" tone="accent">Save changes</Button>` },
  ],
  guidance: {
    do: ["Use variant=\"solid\" tone=\"accent\" for at most one action per view."],
    dont: ["Don't use Button for navigation — use Link, which renders an anchor.",
           "Don't use solid buttons in toolbars; use ghost."],
    instead: { "<button>": "Button", "<a class=\"btn\">": "Link variant=\"button\"" },
  },
});
```

### 13.2 Generated context

- **`llms.txt`** — compact index: every component, one-line summary, prop signature, one canonical example. Target under 15k tokens.
- **`llms-full.txt`** — everything including guidance, tokens, a11y, all examples.
- **`AGENTS.md`** — hand-written, under 200 lines. The Solid gotchas (§7.1), the "never import Kobalte/uPlot/TanStack directly" rule, the token tiers, the §6 shell contract, and the §2.2 anti-patterns. Points to `llms.txt` for inventory.
- **Vendorable skill directory** — `dist/skill/` with `SKILL.md` + `llms.txt` so consuming repos drop it into their skills path. `sheen sync-skill` updates it.

### 13.3 Lint rules (`eslint-plugin-sheen`)

The enforcement layer. An agent that gets an error self-corrects; an agent that reads a style guide does not.

| Rule | Catches |
|---|---|
| `no-raw-color` | hex/rgb/hsl literals and `bg-blue-500` palette classes outside `packages/tokens` |
| `no-arbitrary-spacing` | `p-[13px]`, `gap-[7px]` not referencing a token var |
| `no-native-control` | bare `<button>`, `<input>`, `<select>`, `<dialog>` where a `sheen` component exists |
| `no-direct-primitive-import` | `@kobalte/core`, `corvu`, `uplot`, `@tanstack/*` outside their wrapper packages |
| `no-tier1-in-component` | `--sheen-gray-500` used directly instead of a semantic token |
| `no-physical-properties` | `ml-`, `pr-`, `left-`, `text-left` — requires logical equivalents |
| `no-props-destructure` | `const { x } = props` in a Solid component (reactivity bug, not style) |
| `no-computed-style` | `getComputedStyle` outside `useThemeTokens` |
| `require-class-merge` | a component taking `class` without passing it through `cn()` |
| `no-hardcoded-radius` | `rounded-lg` instead of `rounded-control` / `rounded-surface` |
| `no-document-scroll` | `overflow-y-auto` / `min-h-screen` on a top-level container (§6.1) |
| `require-icon-label` | meaningful `<Icon>` without `label`; icon-only `Button` without a tooltip |
| `no-unknown-icon` | `<Icon name>` not in the registry |
| `no-mount-animation` | entrance animation on layout content; transient layers are permitted (§9) |
| `prefer-layout-primitive` | `flex flex-col gap-4` where `<Stack>` exists (warn) |

Add `no-dynamic-icon-name` and typed `__unsafe_*` warnings. Ship `sheen/recommended`; the app scaffold installs it and Stylelint covers CSS. Every `sheen/*` suppression requires a justification via `eslint-comments/require-description`; doctor fails above ten total suppressions per app. Rules recognize wrapper implementation boundaries and transient-layer motion. Doctor distinguishes static checks from runtime binding snapshots.

### 13.4 CLI

```
sheen new app <name>        # SolidStart scaffold: theme provider, theme script, AppShell,
                            # eslint config, AGENTS.md, skill dir, example route
sheen new theme <name>
sheen new component <name>  # component + meta + demo + test (for sheen itself)
sheen manifest              # regenerate manifest + llms.txt
sheen sync-skill            # pull the current skill dir into a consuming repo
sheen doctor                # audit an app: version drift, lint violations, hardcoded tokens,
                            # components duplicating sheen ones, missing theme script,
                            # document-scroll violations. Exits nonzero.
```

Run doctor in consuming-app CI. `sheen new *` refuses existing targets; `--dry-run` prints changes and `--force` prints a diff before overwriting. `sync-skill` touches only its owned directory and refuses uncommitted changes there. Doctor is read-only and can display the binding table from an app-exported runtime snapshot; source inspection alone cannot enumerate dynamic registrations.

### 13.5 Evals

Score agent adherence with `assay`. Prompts like "build a settings page with three sections and a save bar", "add a filterable table of orders with bulk archive", "add a latency chart with p50/p99". Scored on:

- lint violations per hundred lines
- ratio of `sheen` components to hand-rolled markup
- hallucinated props (not in the manifest)
- raw color / arbitrary spacing count
- Solid correctness (no prop destructuring)
- shell-contract compliance (no document scroll, no full-page spinner)

Run on every change to `llms.txt` or `AGENTS.md` using 20 versioned prompts and per-prompt rubrics in `evals/`. Pin the model/configuration and capture outputs with the M5 baseline. Any hallucinated prop fails. Aggregate gates: at most one lint error per 100 lines and at least 80% of interactive elements sourced from sheen. Subsequent documentation changes may not regress the aggregate metrics by more than 5% relative to baseline; hard thresholds always apply. Report each prompt separately.

---

## 14. Quality gates

### Testing

- **Unit** — vitest + `@solidjs/testing-library`. Every interactive component: keyboard, ARIA, controlled/uncontrolled, disabled.
- **Visual regression** — Playwright screenshots of each variant matrix (§15.2) across a bounded set: `obsidian/dark/comfortable`, `paper/light/comfortable`, `obsidian/light/compact`, `contrast/light/spacious`, plus one RTL pass. Five runs, not forty.
- **Accessibility** — axe-core over every `loupe` page. Zero violations is the gate.
- **Keyboard** — an automated pass that tabs through each layout example and asserts every interactive element is reachable, focus is visible, and no focus trap escapes.
- **Manual assistive technology** — record NVDA with Firefox and VoiceOver with Safari for each release candidate that changes an interactive contract. Cover navigation, AdminApp placement presets, table search/filter/sort/selection/editing, date/time selectors, dialogs/drawers/toasts, and Composer alternatives.
- **Adaptive accessibility** — qualify forced colors, 200% and 400% zoom, reduced motion, RTL, long/multilingual content, tablet/phone behavior, focus-not-obscured, target-size exceptions, and every non-drag alternative required by WCAG 2.2 AA.
- **SSR and hydration** — every component renders without browser-global access and hydrates without mismatch, duplicate nodes/listeners, or replacement of reusable server DOM. Exercise both client and cookie modes, persisted light/dark/system and accent overrides, unavailable/corrupt storage, explicit locales, nested scopes/portals, and delayed JS. Assert the first visible frame has the intended theme with no light-to-dark flash. Test focused controls, editable drafts, table row identities, chart fallbacks, and route transitions through hydration.
- **Refresh continuity** — real delayed/erroring test endpoints drive cold loads, background refreshes, page/filter changes, superseded responses, editing conflicts, and retries. Capture intermediate frames and DOM identity/focus/scroll assertions. Existing content must not flash blank or become a skeleton during revalidation; stale data must not be presented as the new query. No mocks.
- **Performance** — §10.3 and §11.7 define workloads and reference timings; the benchmark protocol below defines executable normalized and absolute frame gates.

### Benchmark protocol

Use a pinned CI runner class and Playwright-bundled Chromium. Playwright upgrades are deliberate PRs that may rebaseline with recorded evidence. Commit seeded generators in `bench/fixtures/`; no real or per-run random data.

Normalize operation timings to a calibration benchmark in the same job. Absolute operation timings in §10.3/§11.7 are reference values, not user guarantees. Compare the median of five runs to a versioned baseline; regressions over 10% fail. Compare cumulative drift to that baseline; three consecutive increases fail even when each increase is below 10%. Store raw runs, calibration, environment metadata, and baseline history.

Initial table render starts immediately before `render()` and ends at the rAF following first paint containing row content. Scroll 10,000px over two seconds and measure CDP frame timings: absolute p99 ≤20ms, no frames over 50ms, and reported long-task counts. Specify dataset dimensions, visible columns, renderers, viewport, and warm/cold setup beside each benchmark. Chart fixtures include four series ×100k points, sustained 60 updates/sec, and a 20-chart theme switch. Define marks per operation, excluding debounce from filter compute time. Check blank scroll frames independently.

The application-readiness benchmark set additionally covers ranked global table search, multi-sort, representative complex cell renderers, AdminApp sidebar collapse, placement presets, DetailsPanel docking/Sheet transitions, command-palette opening, and retained-content refresh. Shell operations fail on unexpected layout shift, remounted accepted content, Long Tasks, or frames over 50ms. A portalled transient layer's own enter/exit geometry is recorded separately and may move; the underlying shell and accepted content still have a zero-shift gate. Profile before optimizing; record traces that attribute improvements rather than accepting opaque timing changes.

### Support contract

Support the latest two stable Chrome, Edge, Firefox, and Safari releases at each sheen release. Feature floors explain prerequisites, not a historical-version support promise. No polyfills or legacy targets. Automate Chromium and WebKit; record manual Firefox checks per release.

Tablet ≥768px is supported/tested. Phone is functional, not optimized: document scroll, M1 shell drawer, M2 table `mobileLayout` cards, and simplified charts retaining data access. UI strings have English defaults and provider message overrides; explicit locale drives server and client `Intl` formatting.

### Bundle budgets

- `core.css` + one theme and accent: under 12KB gzipped. All seven themes and twelve accent presets: under 30KB, using shared modifier layers rather than duplicating complete themes per accent.
- Representative `@gemologic/sheen` application imports: under 55KB gzipped. Tree-shaken single component: under 5KB. The compatibility root remains named-export tree-shakeable; an artificial `export *` of the complete inventory is measured for visibility, not treated as an application budget.
- Explicit `@gemologic/sheen/core`, `/forms`, `/overlays`, and `/navigation` feature entries cap their complete exported graphs at 32KB, 60KB, 55KB, and 58KB gzipped respectively. Heavy code highlighting, table, chart, and pattern engines remain separate packages.
- `@gemologic/sheen-table`: under 45KB gzipped including TanStack.
- `@gemologic/sheen-date`: separate from forms, with no locale-data bundle; establish and commit its isolated consumer budget from the first production implementation before merge rather than guessing from dependency package sizes.
- `@gemologic/sheen-charts`: under 60KB with uPlot; under 20KB for the SVG-only entry point.
- Importing `Button` must not pull a headless primitive, code highlighter, chart engine, or TanStack. Enforced by isolated Vite consumer builds per entry point.
- `@gemologic/sheen-patterns/admin` has its own consumer fixture. Importing base `AppShell` must not pull AdminApp overlay services, date controls, table, charts, or Composer code. Composer and its drag engine are lazy Loupe-only chunks and are forbidden from published package graphs.

### Release

- Changesets on every PR; squash-merge; automated release PR.
- `0.x` while the tier-2 contract moves. Cut `1.0.0` only after both `viz` and `metron` ship on it and the required quality gates pass.
- Deprecations: marked in the manifest, dev-only console warning, one minor version of grace, removed at the next major. Codemods for anything mechanical.

---

## 15. `loupe` — kitchen sink

`loupe` is not a docs site with examples pasted in. It is the primary development environment for `sheen`, the visual regression target, and the theme authoring tool. It should itself be the best argument for the system — if `loupe` feels like a website, something is wrong.

**Stack:** SolidStart (SSR, so hydration is tested honestly), file-based routing, TSX pages.

### 15.1 Global toolbar

Persistent, keyboard-accessible, state serialized to the URL so any configuration is a shareable link.

Theme · Accent (twelve presets) · Mode (dark default; light/dark/system) · Density · Radius · Direction (LTR/RTL) · Motion · Locale · Viewport frame (375 / 768 / 1024 / 1440 / fluid, rendered in a resizable iframe so container and media queries behave honestly).

**Overlays:** 4px baseline grid, spacing highlight (outlines every box), focus-ring-always-visible, force-state (hover / active / focus / disabled on everything), contrast simulator (protanopia / deuteranopia / tritanopia / achromatopsia), reduced-vision blur, FPS meter for table and chart pages.

### 15.2 Component pages

1. **Live playground** — controls derived from the `.demo.tsx` schema: enums become segmented controls, booleans become switches, slots become inputs. The code panel updates to match.
2. **Code panel** — exact JSX for the current state, copy button.
3. **Variant matrix** — auto-generated grid of every `variant × tone × size` plus every interaction state, forced on via injected `data-force-state`. This grid is the Playwright target.
4. **Anatomy** — labeled parts and which tokens control each.
5. **Props table** — generated from the manifest, never hand-written.
6. **Accessibility panel** — live axe result, documented keyboard interactions, ARIA roles, tab-order visualizer.
7. **Do / Don't** for components that are easy to misuse.

### 15.3 Layout gallery

Full-page compositions in iframes, each responding to every toolbar axis. These catch what component pages miss.

- Dashboard: stat row, three charts, activity feed, dense table
- Data table page with every toolbar affordance active, 100k rows
- List-detail (issue-tracker shape): keyboard-navigable list, detail pane, inline editing
- Settings, multi-section
- Form-heavy page: validation states, async submit, field errors
- Notebook / long-form reading view
- Empty, loading, error, permission-denied for each of the above
- Command palette open over each of the above
- **Hostile page:** 500-character strings, zero-width characters, 200 nested menu items, RTL Arabic + CJK + emoji, 100k-row table, 12-series streaming chart

### 15.4 Compare mode

Renders the current component N times side by side in `ThemeScope`s across themes, accents, modes, or densities; full layouts and viewport-width comparisons use isolated iframes. This is the concrete reason §5.2 mandates attribute-scoped theme CSS, and the fastest way to catch a component that hardcoded a color.

### 15.5 Token explorer

Every tier-1 and tier-2 token: name, computed value, visual preview, and which components consume it (from the manifest). Contrast matrix of every fg against every bg with WCAG and APCA scores, failures flagged. Chart palette rendered under each colorblindness simulation. Live filter by name or consuming component.

### 15.6 Theme editor

The feature that makes theme authoring tolerable.

- Edit any tier-2 token via OKLCH sliders or numeric input; the whole app updates live because it's just custom properties.
- Contrast warnings inline as you edit.
- "Derive from base" — pick a background, an accent, and a neutral hue, generate a candidate theme, then hand-tune.
- Import an existing theme as a starting point.
- **Export as a valid `*.theme.ts`**, ready to drop into `packages/tokens/themes/`.
- Work-in-progress persisted to localStorage with graceful unavailable-storage handling. The editor writes a scoped, last-appended style element and invokes the Loupe-only rAF-batched token invalidation hook. Imported theme data is validated, never executed as arbitrary TypeScript.

### 15.7 Navigation

Command palette (`⌘K`) over components, patterns, tokens, and layout examples. `loupe` dogfoods `sheen`'s own CommandPalette, shortcut registry, and AppShell.

### 15.8 Composer

Composer is a design-time application-layout workbench, not a runtime page-builder product. It opens with the complete `AdminApp` starter and renders real Sheen components in an isolated iframe. The interface has a component palette, central application canvas, and property inspector, with the normal Loupe theme, accent, mode, density, direction, locale, motion, and viewport controls.

Its internal versioned layout AST contains semantic regions and component nodes, never pixel coordinates, CSS declarations, imported code, or arbitrary executable expressions. Initial regions are topbar, sidebar, page header, toolbar, main grid, details panel, status bar, and overlays. `AdminApp` placement presets and individual semantic-zone overrides are editable. Each component appears once, and the grammar rejects invalid nesting before rendering or code generation.

The palette is opt-in through manifest `composer` metadata (§13.1). Start with a curated set of application patterns and high-value primitives; add coverage only with a deterministic fixture, safe prop editor, valid-parent rules, and generator. Fixture factories produce seeded lorem text, users, records, activity, charts, and state variations without network data, clocks, or random per-render output.

Pointer dragging uses a lazy Loupe-only Pragmatic Drag and Drop integration. Dragging is convenience, never the only interaction. Every node exposes Add before/after, Move, Move to region, Duplicate, Configure, and Remove controls; completed changes are announced. Undo and redo cover every structural and prop edit. Preview-only theme and viewport changes do not enter layout history.

Loupe stores recoverable local drafts and supports versioned JSON import/export, but this schema is private and may change without package semver. The durable output is deterministic copyable TSX using only public Sheen imports. Generate a self-contained sample form and a structure-only form with named application placeholders; both must format, typecheck, lint, SSR-render, and hydrate in CI. Generated code contains no Composer runtime, internal metadata, arbitrary CSS, or drag dependency.

---

## 16. Milestones

Milestones define dependencies and acceptance, not fixed calendar promises.

**M0 — Spike.** Monorepo/build, tokens, obsidian/paper prototypes, dark-default provider/scope with accent axis, Button/Input/Dialog, contextual portals, Loupe toolbar. Compare jade/indigo/amber, demonstrate side-by-side scopes, and prove first-paint/hydration handoff with delayed JS before expanding the library.

**M1 — Foundation.** Complete semantic tokens, seven themes, twelve accents, both modes, density/radius/motion, and contrast validation. M1 inventory, icon build integration, AppShell, ScrollArea, shell drawer, shortcut registry/question-mark sheet, focus model, status bar, unsaved changes, Solid router adapter, messages/locale, refresh continuity, and component pages. No palette binding until M2. Establish SSR, keyboard, accessibility, metadata/example checks, and initial visual gates as components arrive. Publish 0.1.0 after these pass.

**M2 — Data and application readiness.** Complete §10: client/server processing, pagination/continuous mode, virtualization, FilterBar, selection, grouping/tree loading, export/views adapters, edit conflicts, integrated/framed presentation, public global search, and calibrated benchmarks. Add AdminApp, semantic chrome placements/presets, AdminTopbar/TopNav, account/workspace patterns, DetailsPanel, notification/toast/confirm composition, and the compact starter. Complete the date/time package, SegmentedControl, TagInput, FileDropzone, ActivityTimeline, and Stepper. CommandPalette with mod+k, ContextMenu, general Drawer, Resizable, TanStack Router adapter, and phone table cards remain part of the milestone.

**M3 — Charts.** uPlot wrapper, canvas token bridge, line/area/bar charts, Sparkline, Stat/StatGroup, columnar/streaming validation, keyboard data alternative, palette validation, and calibrated chart benchmarks.

**M4 — Theming tools and composition.** Full token explorer/editor/export, contrast matrix, simulations, theme/accent comparisons, layout gallery/hostile fixtures, debug overlays, RTL/responsive passes, expanded visual matrices, the structured Loupe Composer, QueryBuilder, and advanced code/data viewers. Density/radius correctness is required when components land, not postponed to M4.

**M5 — Agent tooling.** Complete generated manifest/context/skill artifacts, all three CLI scaffolds, doctor/sync-skill, full lint/suppression policy, and 20-prompt assay baseline. Metadata and example checks begin in M1.

**M6 — Dogfood and release.** Only after Sheen's application-readiness work is polished and publishable, migrate both viz and the explicitly identified metron repository, record/fix friction, rerun release gates, and cut 1.0.0 after both apps ship.

Deferred inventory lands only when an app needs it.

---

## 17. Decisions and deferred scope

1. **Defaults.** Dark on fresh install; respect explicit persisted preferences; system mode opt-in. Six themes and twelve independent accents are the initial target. Jade is the selected default after the M0 comparison; all presets remain equally available.
2. **Contrast.** Muted text/placeholders meet AA; disabled/decorative subtle content is exempt. Split structural/control borders. Validate visible focus against adjacent colors (§5.6).
3. **Solid migration.** Keep pinned Solid 1.9 for this implementation; a future major can drop it after upstream qualification. Dual-major support is deferred.
4. **Market charts.** Candlesticks, depth charts, and order books are outside sheen-charts; any future implementation belongs in sheen-market.
5. **MCP.** Out of scope; reconsider if generated file context becomes insufficient.
6. **Custom icons.** Deferred until real app use justifies a custom set.
7. **Fonts.** Self-host IBM Plex with its license; paid fonts belong to private theme/app configuration and are never bundled.
8. **Ownership.** Gemologic-owned, MIT, public npm packages. Product-specific configuration remains private in consuming applications.
9. **Infinite fetching.** Deferred independently of continuous display; bounded complete results and explicit pagination are in v1.
10. **Admin baseline.** `AdminApp` is the compact, opinionated brand baseline over low-level AppShell. Semantic chrome zones may move among validated topbar/sidebar placements and named presets; arbitrary shell layout remains out of scope.
11. **Table presentation.** One DataTable implementation owns integrated/framed presentations. Admin layouts default to integrated compact chrome with automatic capability-driven search/filter/column/export controls; standalone tables default to framed and explicit controls.
12. **Accessibility.** WCAG 2.2 AA automation, keyboard coverage, adaptive modes, and recorded NVDA/Firefox plus VoiceOver/Safari qualification are release gates, not optional polish.
13. **Date/time.** Date and time selectors move into active scope in a separate package using hidden Ark UI and `@internationalized/date` implementations behind Sheen-owned serializable values.
14. **Composer.** Loupe Composer is a structured design-time editor with private drafts and deterministic public-API TSX output. It is not a runtime page builder; its lazy drag dependency never enters published packages, and every drag result has a non-drag alternative.
15. **Dogfood timing.** Viz and metron integration wait until the application baseline is refined, qualified, and ready to publish. The metron repository must be identified explicitly before migration work starts.
16. **Audit.** Original dispositions, accepted follow-ups, and the application-readiness approval set are incorporated in their owning sections. TODO.md records decisions and implementation tasks; remaining choices are explicitly deferred.

## 18. Reference material

- [WCAG text contrast, including placeholders](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- [WCAG non-text contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast)
- [TanStack Table v8 pagination](https://tanstack.com/table/v8/docs/guide/pagination)
- [Solid hydration](https://docs.solidjs.com/reference/rendering/hydrate)
- [Solid hydration bootstrap](https://docs.solidjs.com/reference/rendering/hydration-script)
- [Ark UI DatePicker](https://ark-ui.com/docs/components/date-picker)
- [React Spectrum calendar and `@internationalized/date` value model](https://react-spectrum.adobe.com/Calendar)
- [Pragmatic Drag and Drop](https://github.com/atlassian/pragmatic-drag-and-drop)
- [Pragmatic Drag and Drop accessibility guidance](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines)
