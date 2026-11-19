# Upgrading to Sheen 0.3.0

Instructions for an agent upgrading an application from Sheen 0.2.x to 0.3.0. Work through the steps in order. Mechanical steps say exactly what to change; steps marked **decision** need product judgment, so make the call from the surrounding UI and list each one in the handoff.

Read the application's own `AGENTS.md` first. Its rules win over this guide.

## 1. Dependencies

All `@gemologic/sheen*` packages and `eslint-plugin-sheen` share one version line. Move every one the app uses to `0.3.0` together; `sheen doctor` reports `declared-version-drift` and `installed-version-drift` when they differ.

- `@gemologic/sheen`, `@gemologic/sheen-tokens`, `@gemologic/sheen-icons`, `@gemologic/sheen-patterns`, `@gemologic/sheen-table`, `@gemologic/sheen-charts`, `@gemologic/sheen-date`, `@gemologic/sheen-code`, `@gemologic/sheen-cli`, `eslint-plugin-sheen`: `0.3.0` (or `^0.3.0`, matching the app's existing style).
- **Breaking:** `solid-js` must be exactly `1.9.19`. `sheenRuntime()` throws at build time on any other version. 1.9.15 is no longer valid: a fresh `vite-plugin-solid` install resolves `babel-preset-solid@1.9.19`, which requires `solid-js ^1.9.16`.
- `vite`: Sheen's peer range is still `>=8 <9`. Scaffolds now pin `8.3.8`, which fixes the Vite 8.2.2 security advisories. Bump if the app is below it.
- Leave `@solidjs/start` (2.0.4), `@solidjs/router` and `@solidjs/meta` alone. Do not move to Solid 2; Sheen does not support it yet.

Then:

```sh
pnpm install
pnpm sheen doctor        # must report no diagnostics
pnpm sheen sync-skill    # refreshes the vendored Sheen agent skill and llms.txt
```

`sync-skill` refuses to replace uncommitted content in its managed directory. If it refuses, stop and report rather than deleting anything.

After syncing, reread the refreshed `llms.txt` (also served at https://sheen.gemologic.dev/llms.txt) before writing new Sheen code. 0.3.0 adds many components.

## 2. Button default variant (breaking, decision)

`Button` and `buttonVariants()` now default to `variant="outline"` (a raised, bordered button) instead of `ghost`. Every `Button` without an explicit `variant` changes appearance.

Find them:

```sh
rg -n '<Button\b' src | rg -v 'variant='
rg -n 'buttonVariants\(' src
```

`rg` only sees the opening line, so check multi-line JSX by hand, or use `ast-grep` for a structural match.

For each hit, decide:

- Quiet chrome, such as toolbar actions, inline row actions, "more" triggers and secondary actions next to a primary one: add `variant="ghost"` to keep the 0.2 look.
- Standalone actions that should read as buttons: leave the new outline default.
- Primary calls to action: keep or add the solid variant.

Sheen's own close, clear, disclosure, tab and pagination controls are already ghost. Don't wrap or restyle them.

`Link variant="button"` now accepts `appearance`, `tone` and `size`. If the app styled links to look like buttons by hand, switch to those props.

## 3. Tier-one token ramps (breaking if referenced)

The primitive ramps moved out of `@gemologic/sheen-tokens/core.css` into the opt-in `@gemologic/sheen-tokens/primitives.css`. Application CSS that reads them now gets undefined values.

```sh
rg -n -- '--sheen-(gray|jade|rose|amber|cyan|violet|size|radius|font-size|font|duration|ease)-' src
```

The fix depends on where the variable comes from:

- **Components and app styles:** replace raw ramp variables with the semantic tier-two token for the role, such as surface, fg, border, spacing, radius, type or motion. This is the required fix. Sheen forbids raw ramps outside the token compiler.
- **Genuine token tooling** (a palette viewer, a theme editor): import `@gemologic/sheen-tokens/primitives.css` explicitly.
- **Unaffected:** `--sheen-z-*` and `--sheen-shadow-*` stayed in `core.css`.

Semantic theme tokens with similar names, which themes define themselves, also still resolve. Check each hit against the token catalog before changing it.

## 4. Type changes

- `ThemeState.accent` is now `string`, not a union of bundled accent IDs. Code that switched exhaustively over accents, or typed a variable from the old union, needs a default branch or a local union.
- Custom accents are first-class now. If the app forced a brand color through CSS overrides, replace that with `defineAccent({ id, seed })` from `@gemologic/sheen-tokens`. Register the ID through `ThemeProvider accents` and `createThemeScript({ accents })`, both with the same list. `sheen new accent <name>` scaffolds a definition. Invalid explicit definitions throw `ThemeValidationError`.
- Private themes keep their declared `schemaVersion` and migrate automatically to schema 5. Schema 5 adds the motion roles and the `text-display-*` and `text-lead-*` tokens. Don't bump `schemaVersion` unless you are deliberately adopting the new tokens.

## 5. Behavior changes that break tests

Run the app's test suite after steps 1–4. These are the expected breakages:

- **Loading buttons stay focusable.** A `Button` with `loading` (and loading `IconButton`/`Tooltip` triggers) no longer sets native `disabled`. It exposes `aria-disabled="true"` and `aria-busy="true"`, and suppresses activation and form submission. Replace `toBeDisabled()` or `:disabled` on loading buttons with `toHaveAttribute("aria-busy", "true")` or `aria-disabled`. Code that relied on the native `disabled` to block a submit is still protected.
- **Overlay close buttons moved.** `Dialog`, `Drawer`, `Sheet` and `Popover` close from a corner icon button that is last in tab order. They keep a labelled footer close only with an explicit `closeLabel`, or for an alert dialog. Tests that clicked a footer "Close" text button should target the button by role and accessible name. Tests that count tab stops need updating. **Decision:** if the flow needs a visible labelled close, pass `closeLabel`.
- **Toasts** dismiss from an icon button. Select by role and name.
- **Pagination** first/previous/next/last are icon buttons with the same accessible names. Role-and-name selectors keep working; text selectors don't.
- **Stat tweens numeric values** on update by default. Assertions that read a `Stat` right after an update may see intermediate numbers. Wait for the final text, emulate reduced motion (which disables all tweening), or pass `tween={false}` where the product doesn't want the motion.
- **Visual baselines will change.** The depth and surface retune, a focus ring that follows the accent, new elevations, tinted notices, control transitions and the new Button default all show up in screenshots. Re-capture the baselines after reviewing them. Don't loosen thresholds.

## 6. Layout changes to check

Look at each affected screen once. Nothing here needs code unless it looks wrong.

- **TimeSeries:** the legend and zoom controls sit in a header row beside the title, and the x-axis title is no longer drawn on the canvas (`xLabel` still names the table column and the screen-reader context). The plot is about 85px shorter for the same `height`. Raise `height` where the plot area matters. The new optional props are `area` (gradient fill) and `live` (a pulsing latest point).
- **PageHeader** titles use the h3 size.
- **DataTablePage** puts saved views and page actions in the title row. Its header, toolbar and status row share one inline gutter.
- **AdminApp:** the topbar command trigger reads as a search field, the active sidebar item gets an accent marker, and a single-section sidebar hides its visible heading. Phone and tablet topbar layout changed.
- **DataTable `rowHeight`** now sizes cells as well as rows. Remove any workaround CSS for clipped two-line cells. Auto-fit can now shrink a column as well as widen it.
- **Drawers** scroll their body instead of stretching. Remove any app CSS that forced that.
- **ListDetailLayout** list items lose stray bullets and gain dividers.

## 7. Workarounds you can delete

- **`useTheme()` setters inside `AdminApp`.** `setMode`, `setAccent` and the other setters now forward to the parent for the axes the scope doesn't pin. Remove any code that reached around `AdminApp` to the root theme.
- **Date pickers inside modals.** `DatePicker` and `DateRangePicker` now work inside a modal `Dialog`, `Drawer` or `Sheet`: keyboard selection works, and the first Escape closes only the calendar. Delete any non-modal or portal workaround.
- **Focus.** Menu and submenu focus no longer jumps back after fast keyboard navigation, and closing a Popover or Dialog quickly returns focus to its trigger. Remove manual focus-restoration code added for those bugs, then re-run the app's keyboard tests.
- **Hand-rolled pieces now in Sheen.** Replace these where the app built its own:
  - `Glyph` for chevron, close or check characters;
  - `List`/`ListItem`;
  - `Banner`, or dismissible `Alert`/`Callout`;
  - `Form`/`FormSection`/`FormActions`;
  - `Prose`;
  - `createMediaQuery`/`useBreakpoint` with the shared `breakpoints`;
  - `formatShortcut`/`useShortcutLabel`.

  Only replace one when it is a like-for-like swap; don't restructure screens to adopt new components.

## 8. Optional adoption

Don't do any of this unless the task asks for it:

- **CSS islands:** `@gemologic/sheen/styles/core.css` plus `forms.css`, `overlays.css` and `navigation.css` instead of the full `styles.css`. `core.css` is required. `ShortcutSheet` needs `overlays.css`. `styles.css` keeps working unchanged.
- **New entries:**
  - `@gemologic/sheen/ai` (chat: `PromptInput`, `Conversation`, `Message`, `StreamingText`);
  - `@gemologic/sheen/sortable` (`SortableList`, `Board`, plus `styles/sortable.css`);
  - `@gemologic/sheen-patterns/marketing` (public-site sections, plus `marketing/styles.css`).
- **New charts:** `DonutChart`, `ScatterChart`, `Heatmap`, `Histogram`, `Gauge`, `BarSparkline`.
- **Live-data motion:**
  - `NumberText flash` and `tween`;
  - DataTable accessor columns with `flash: true`;
  - `flashChange` for custom renderers.
- **Icons:** the catalog grew from 42 to 257 names. Existing names and artwork are unchanged.

## 9. Verify and hand off

Run the app's own checks as its CI defines them: typically lint, typecheck, unit tests, build, and its browser tests. Then confirm:

- [ ] `pnpm sheen doctor` is clean.
- [ ] The production build starts, and SSR markup is complete with JavaScript disabled on the main routes.
- [ ] Keyboard paths through dialogs, menus and date pickers still work.
- [ ] Dark mode (the default) and light mode both look right on the main screens.

In the handoff, list:

1. Each **decision** you made: Button variants (count the ghost versus outline choices), `closeLabel` additions, `tween={false}` uses and `TimeSeries` height changes.
2. Every raw token variable you replaced, and what replaced it.
3. Workarounds you deleted.
4. Anything you could not verify. Name the browser engine of any browser tests you ran.
