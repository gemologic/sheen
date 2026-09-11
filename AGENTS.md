# Sheen agent instructions

## Scope

Sheen is a SolidJS design system with separate token, icon, UI, table, chart, pattern, lint, and CLI packages. Read `SPEC.md`, `TODO.md`, and the relevant focused document before changing a public contract. `llms.txt` is the generated component inventory; `llms-full.txt` contains the complete generated guidance.

The repository may be edited concurrently. Treat Git commands as read-only context and never revert work you did not author. Do not mutate Git state.

## Workflow

- Think through public APIs, schemas, and multi-file changes before editing.
- Fix root causes and remove obsolete code completely. Do not leave relocation comments or compatibility debris.
- Use `rg` for search and `apply_patch` for hand edits.
- Use pnpm for JavaScript and TypeScript. Prefer scripts exposed by `default.nix`, but do not mutate Nix state without explicit permission.
- Research a new dependency from official sources, explain its maintenance/API fit, and obtain explicit approval before adding it.
- Follow `.github/workflows` for CI parity. Stop commands that exceed five minutes and report their logs before retrying.

## Solid and TypeScript

- Never use `any`. Avoid type assertions; model the actual shape and validate external data.
- Do not destructure component props. Read props directly or use `splitProps`/`mergeProps` so access stays reactive.
- With `exactOptionalPropertyTypes`, omit absent optional JSX props instead of passing `undefined`.
- `ref` is a normal prop. Use `class`, merge it through `cn()`, and spread remaining native attributes onto the root.
- Resolve children once with Solid's `children()` helper when they may be evaluated repeatedly.
- Keep stable application identities stable in the DOM. Do not key owners by request revisions or presentation state.
- Assume modern supported browsers. Do not add legacy polyfills.

## Package boundaries

- Applications import only public `@gemologic/sheen*` entries.
- Kobalte and Corvu stay behind UI wrappers. TanStack stays behind table/router adapters. uPlot and d3 stay behind chart wrappers.
- Public escape hatches are named `__unsafe_*`, typed, lint-warned, and easy to grep.
- Use `Link` for URL changes and `Button` for actions. A link can use `variant="button"`; a button can use `variant="link"`.
- Keep heavy table/chart engines out of the UI package and out of single-component bundles.

## Tokens and styling

- Components use semantic tier-two tokens. Never reference raw tier-one ramps outside the token compiler.
- Use logical properties and tokenized spacing, type, radii, motion, z-index, and color.
- `fg-muted` still meets AA. Structural borders may be quiet; required control boundaries meet 3:1.
- Focus uses the independent focus-ring token plus the actual surface's focus-ring offset.
- Accent is scarce and independent of status/market colors. Dark is the fresh-install default; themes and accents remain independent axes.
- Layout content does not animate on mount. Transient layers may animate their action-driven enter/exit and must honor reduced motion.

## SSR, hydration, and refresh

- Server markup is complete and deterministic. Do not hide real content behind `onMount`, `window`, `matchMedia`, or a client-only branch.
- Client theme hydration lets the blocking script own root attributes. Cookie mode emits server-authoritative attributes. Do not create two owners for the same attributes.
- Scoped overlays mount in the contextual portal target and inherit the complete effective theme state.
- Background refresh retains accepted content, DOM identity, focus, selection, drafts, expansion, and scroll where targets survive.
- Use cold skeletons only for a region with no accepted content. Never replace accepted refresh content with a skeleton or blank state.
- Abort superseded work and reject stale results with monotonic identity. Publish coherent query/data state atomically.
- Authorization changes clear unauthorized content immediately.

## Tables and charts

- Pagination and virtualization are independent. Use continuous client mode only for complete bounded data; prefer numbered server pagination for large or expensive remote queries.
- Continuous server mode requires one complete bounded response where `rows.length === total`. Never walk pages for export or select-all.
- Use stable row IDs. Preserve accepted pages during revalidation and disable operations that would mistake previous rows for the requested query.
- Chart time columns are strictly increasing UTC epoch milliseconds in `Float64Array`; timezone affects formatting only. `NaN` is a visible gap, never zero or interpolation.
- Canvas reads theme tokens only through the shared token bridge and redraws without remounting.

## Tests and evidence

- No mock tests. Use real unit behavior or real end-to-end endpoints.
- Unless requested otherwise, run only tests added or modified, plus the build/type/lint/manifest checks needed by the changed contract.
- Every exported component requires exhaustive `.meta.ts`, a compiling example, a demo, SSR coverage, keyboard coverage when interactive, and relevant refresh/hydration coverage.
- Browser refresh tests inspect intermediate frames and retained node identity, not only the final screenshot.
- Report exactly what ran. Do not present Chromium as WebKit, static checks as runtime proof, or local checks as hosted CI/release proof.
