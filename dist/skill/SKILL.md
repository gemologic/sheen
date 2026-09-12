---
name: sheen
description: Build SolidJS interfaces with the Sheen design system, its public components, semantic tokens, SSR hydration contract, and retained-refresh behavior.
---

# Sheen

Read the bundled `llms.txt` before choosing components or props.

- Import application components only from public `@gemologic/sheen*` entries. Never import Kobalte, Corvu, TanStack, uPlot, or d3 directly in consuming apps.
- Keep `solid-js@1.9.15` as the shared app core and `sheenRuntime()` from `@gemologic/sheen/vite` in Vite/SolidStart. Sheen ships the browser renderer and overlay backend; SSR keeps the peer renderer/request-storage pair. Do not add consumer patches.
- Use `Link` when an interaction changes the URL and `Button` for actions.
- Use semantic `--sheen-color-*`, spacing, type, radius, and motion tokens. Do not use tier-one ramps in components.
- Keep Solid props reactive. Use props directly or `splitProps`; never destructure component props.
- With `exactOptionalPropertyTypes`, omit absent optional JSX props instead of passing `undefined`.
- Emit complete deterministic server content. Do not branch initial markup on browser globals or a mounted signal.
- During background refresh, retain accepted content and stable identities. Preserve focus, drafts, expansion, and scroll; accept coherent results atomically.
- Use `pagination={false}` only for complete bounded table data. Prefer numbered server pagination for large or expensive remote results.
