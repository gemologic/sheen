# Component metadata and demos

Every capitalized callable export from a package's `src/index.ts` requires a colocated `<ExportName>.meta.ts` and `<ExportName>.demo.tsx`. This includes providers, arrow-function components, and exported aliases. Remove their metadata when removing the export. Overloaded signatures need a unified props contract before they can enter the manifest.

Metadata imports `defineMeta` and the component's props as a type-only import. It must not import the component at runtime: Node evaluates trusted metadata during the build, without a JSX loader. The metadata helper is deliberately absent from the component runtime entry point.

See [Button metadata](../packages/ui/src/primitives/Button.meta.ts) and its [demo](../packages/ui/src/primitives/Button.demo.tsx) for the complete pattern.

## Prop coverage

Write a description for every sheen-owned prop, including props inherited from sheen-owned interfaces. Solid/HTML inherited props are enumerated automatically, including their full TypeScript types and required/optional status. They may also receive authored guidance. Missing sheen props and documented-but-nonexistent props fail the build. Unbounded index-signature, unknown, and untyped contracts cannot provide exhaustive coverage and are rejected.

Do not maintain a second handwritten prop type. The generated manifest gets types from the actual exported component signature through ts-morph. Optional metadata defaults and demo control values are extracted into real TypeScript assignments against those props. Select controls must enumerate every finite literal option. TypeScript catches invalid values; the coverage checker catches omitted options.

The demo exports its renderer as default and `controls` from the metadata's prop schema. Demo renderers are TSX and participate in the normal workspace typecheck. Provider demos must run in an isolated document because providers own root document attributes.

## Styling and semantics

Component styles live in the `components` cascade layer, below consumer utilities. Keep application resets in `base`; unlayered resets can otherwise override a component's explicit type roles. Accept and merge `class`, and test a real token-based utility override instead of assuming class string order proves CSS precedence.

Text is inline; use paragraph markup around prose when appropriate. Heading requires a semantic level independently of its visual size. Code and Kbd emit their native elements. Badge is a text label, not automatically a button or live region. Tag removal uses a native button and a localized accessible name; the application owns collection mutation and focus restoration after removal.

Surface establishes its own focus-ring offset; Card composes a raised, bordered Surface without an automatic shadow. Use the surface variant instead of replacing its background independently of the focus tokens. Separator is semantic unless explicitly decorative. Callout is a static note; Alert is urgent, does not steal focus, and never auto-dismisses. Initial server-rendered alerts are not guaranteed to be announced by screen readers; the [ARIA alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/) distinguishes them from dynamically appearing alerts.

Visual fixtures must constrain their scrolling panes. Before accepting a tall-element screenshot, verify that both its first and last meaningful content are in view; an image with blank clipped regions is not coverage of that component.

## Examples and checks

Supply at least one example with a title and JSX expression. Optional `setup` contains statements inside that example's component function. All exported components in the package are available to the expression. Examples are extracted into in-memory TSX files under the package source context and typechecked, not executed as arbitrary runtime examples by the build. Browser behavior still requires real component tests.

Run `pnpm manifest` after the package builds. The command checks export coverage, prop coverage, metadata shape, demo exports, example compilation, and stale metadata files before generating `sheen.manifest.json`, `llms.txt`, `llms-full.txt`, and `dist/skill/`. `pnpm check` includes it, so CI uses the same gate. Do not hand-edit generated artifacts.

The generated context deliberately includes only sheen-authored props. Standard platform props remain exhaustive in `sheen.manifest.json`, but repeating inherited DOM declarations would bury the component contract in the compact and full guidance. See [agent context](agent-context.md) for the format and proof boundary. CLI scaffolds, lint rules, assay, and manifest-driven Loupe playground pages remain in TODO.md.

## Avatars and scalar indicators

Avatar requires a useful accessible label. It renders deterministic initials when no image is available, keeps that fallback behind an image while the source loads, and restores it after a load failure. A source change retains the Avatar root and fallback, so an image refresh cannot expose an empty frame. Mount also detects an image that failed before hydration attached its error handler. AvatarGroup requires stable unique IDs, renders at most `max` identities, and formats its translated `{count}` overflow label through the scoped locale.

Progress and Meter use native elements. Omit Progress `value` only for genuinely indeterminate work. Meter always requires a finite value and is for a bounded scalar measurement, not task completion. Their public numeric props reject strings, non-finite values, reversed bounds, and out-of-range thresholds. Accepted reactive value updates retain the native node through hydration and refresh.

## Description lists

Use `DescriptionList` for name/value content, with `DescriptionTerm` and `DescriptionDetails` children. The default stacked layout supports multiple terms or descriptions in a group. Column layout expects one term followed by one details element per row. These render native `dl`, `dt`, and `dd`, not a grid widget or live region. Keep actions inside the value and preserve their normal tab order. `numeric` enables tabular figures only; use the locale formatter for formatting.

## Cold-load placeholders

`Skeleton` is static, decorative, and inert. Size it to match the expected content using logical style properties. The app owns the cold-load delay (200ms), the region's busy state, and a localized status announcement. Do not place meaningful content or controls inside it. Never swap already-loaded content for a skeleton during refresh, and never add shimmer or pulse animations. A pending refresh retains existing DOM and uses the pane-level pending affordance instead.

## Styled tables

Use `Table` for small, bounded semantic tables. Supply a caption or an accessible name, explicit row groups (`TableHead`, `TableBody`, `TableFoot`), and `TableHeaderCell` with the appropriate scope. Column scope is the default; row headers require `scope="row"`. Cell height is a minimum, so embedded controls and wrapped content may expand a row. Numeric cells use end alignment and tabular figures. Applications provide a constrained scrolling pane when needed.

These components do not implement a grid widget. Static rows are not tab stops, and embedded controls retain their native keyboard order. Use M2 DataTable for virtualized datasets, selection, filtering, pagination, and delegated requests.

## DataTable sizing, layout, and pagination

DataTable keeps data processing and pagination as independent choices. Use `pagination={false}` for a complete, bounded client dataset when continuous scanning is the useful interaction. Use numbered server pagination for large or expensive remote results. Virtualization bounds mounted DOM in both modes; it does not make an unbounded response safe to download or retain. Server continuous mode therefore accepts only complete results where `rows.length === total`, never walks pages automatically, and should not be selected by an arbitrary universal row-count cutoff. Consider payload bytes, column width, transformation cost, freshness, and the need for page-addressable URLs.

Client pagination remains useful when the complete data is local but users need stable review batches, shareable page state, or reliable landmarks. On any delegated page change, retain the accepted page until the replacement is accepted atomically, mark it as the previous query, and disable actions that could mistake it for the requested page. Cursor or infinite loading is a separate contract, not `pagination={false}`. See [Table pagination state](table-pagination.md) for clamping, reset, export, selection, phone-card, and hydration rules.

`DataTablePage` composes page actions, filters, controlled saved views, regional states, and status around one table owner. It does not choose or duplicate pagination, selection actions, or row actions. See `docs/data-table-page.md` for the composition, refresh, authorization, and hydration contract.

`SettingsLayout` must live inside AppShell so app-owned dirty state participates in navigation blocking and `beforeunload`. Return the real save promise, keep section fields editable during it, and accept only the submitted draft version on completion. Its save bar remains mounted when clean, pending, or failed. See `docs/settings-layout.md`.

Column layout is presentation state. Visibility, order, logical pin position, and committed width update locally and call `onAcceptedStateChange`; they do not invoke the server data adapter or replace accepted rows. Query and page requests continue to retain the last accepted layout if a response was started before a layout change. Stable column and row IDs preserve surviving header, cell, focus, and scroll identities through reorder, hide/show, refresh, and hydration.

Pointer resize writes one per-column CSS custom property at most once per animation frame and commits state only on pointer release. The focusable `separator` exposes its pixel value and supports physical Left/Right plus Home/End keys; Shift changes the step from 10 to 50 pixels. Double-click auto-fit samples the header and currently realized virtual cells, because mounting an entire dataset solely to measure it would defeat virtualization. The Columns menu provides keyboard paths for visibility, one-position logical moves, pinning, auto-fit, and width reset. Pointer reorder cannot cross a pin region; change the pin explicitly first. Initially pinned definitions require numeric widths, and pinning a fill/content column captures its rendered width before making it sticky. Start/end pinning and drop placement follow scoped direction.

Multiple selection is table-owned and originates only from accepted, loaded row IDs. Explicit selection retains those IDs when their pages unload. “Select all matching” instead emits a frozen filter AST plus an exclusion list; it never walks server pages. The all-matching action is unavailable while the separate fuzzy-search field is nonempty because that search criterion is not representable in the accepted bulk payload. Page selection, row Space, Shift+Arrow and Shift+click ranges, modifier-click toggles, and scoped Ctrl/Cmd+A all operate on the accepted loaded view. Sorting and page changes retain selection; an accepted filter or search change clears it. Change `selection.resetKey` when an account or permission boundary changes so the table clears selection and loaded-row eligibility immediately. The app authorizes and executes every emitted bulk payload.

## DataTable grouping and hierarchy

Grouping and hierarchy are separate tree presentations and cannot be enabled together. Client grouping operates only on a complete continuous result (`pagination={false}`), so its counts and configured `sum`, `average`, `min`, `max`, or `count` aggregates describe the full accepted view. Server grouping supports numbered pagination, but the response must provide `groups` explicitly. Each group lists its contiguous accepted-page `rowIds` while `count` and `aggregates` describe the full query group. DataTable validates exact page coverage, page order, unique group values, and every configured aggregate. It never fabricates a full-group total from one page. See `docs/table-grouping.md` for the response and interaction contract.

Hierarchy accepts static `getChildren` results and optional app-owned `onLoadChildren(row, signal)` requests. When asynchronous children are possible, provide `hasChildren` so known leaves are not exposed as expandable. Each node has an independent request token and AbortSignal; collapse, reset, replacement, and disposal abort obsolete work, and a late response cannot overwrite the current subtree. Failure keeps the parent and exposes retry. Change `hierarchy.resetKey` at account or authorization boundaries to remove loaded descendants and expansion immediately. Default-expanded remote nodes start loading after hydration, never during SSR.

Grouped and hierarchical rows use treegrid metadata. Up/Down retains normal row navigation. Right expands a closed parent or moves into its first visible child; Left collapses an open parent or moves to its parent. Enter and Space toggle a focused group, while a data row retains its normal activation or selection behavior. All-matching selection is unavailable for hierarchy because the flat filter payload cannot describe an unloaded subtree. This is a fail-closed scope rule, not an invitation to walk every subtree.

## DataTable filters

Declare filter types on accessor columns. DataTable renders FilterBar by default when at least one declaration exists; use `filterBar={false}` only when a surrounding composition owns equivalent controls. FilterBar edits the accepted `FilterNode` directly, preserves nested boolean structure, and publishes one validated update only when a local draft is applied. Enum facets describe the complete accepted client result or come from the accepted server response, never the visible page. Basic date ranges use inclusive UTC calendar-day bounds. See `docs/table-filters.md` for operator, focus, delegation, and hydration contracts.

## DataTable exports

Client export is available by default for visible accessor columns and snapshots the complete accepted filtered/sorted view, even when the UI is paginated. Active selection narrows that view. Server tables expose export only when the app supplies `onExport`, which receives the accepted state, immutable selection, and an AbortSignal and returns a complete Blob. Use `export.resetKey` at account or permission boundaries. See `docs/table-exports.md` for escaping, retry, artifact lifetime, and hydration behavior.

## DataTable inline editing

Declare `editor.type` only on accessor columns and supply one table-level `onCellCommit`. Resting cells are committed focusable spans; text, number, select, and boolean editing uses native uncontrolled controls. Validators run synchronously before transport. Return an explicit conflict result when an app version check fails, and change `editResetKey` at account or permission boundaries. Do not mutate the DOM editor from app state or parse transport-error strings into conflicts. See `docs/table-editing.md` for commit ordering, retry, stale refetch, focus, and hydration rules.

## DataTable chrome and refresh

Define row and bulk actions once through `actions`; DataTable renders the same model in its selection bar and row context menus. Footer reducers receive the complete transformed client view but only the accepted response rows in server mode. Cold load, accepted empty, filtered no-results, initial error, retained refresh, and refresh error are deliberately distinct states. Accepted rows never become skeletons or blank markup during revalidation. See `docs/table-chrome.md` for action payloads, delayed indicators, hydration, footer scope, and pagination guidance.

Table and FilterBar English defaults live in `@gemologic/sheen-table`, while typed overrides still flow through `ThemeProvider.messages` and nested ThemeScope inheritance. This preserves one localization context without retaining the table catalog in UI-only bundles.

## Field composition

`Input` already includes a Field. Supply `label`, optional `description`, and an app-owned `error` message directly; do not wrap it in another Field. Descriptions and errors are both associated with the input, alongside any caller-supplied `aria-describedby` IDs. An error marks the input invalid without moving focus or replacing the draft. Required and disabled remain native control states.

Custom labelable control implementations can use `<Field label="Notes">{control => <textarea {...control} />}</Field>`. Spread the reactive control bindings without destructuring or copying them; they contain the generated ID, descriptions, invalid state, required, and disabled. Render exactly one labelable control. Field is not a replacement for fieldset/legend group semantics. Validation timing and live announcements remain app-owned.

SearchInput's uncontrolled `defaultValue` is captured at creation and restored after an uncanceled native form reset. A changed reset value emits `onValueChange`; native reset does not manufacture an input event. Controlled queries remain app-owned: a form reset does not change the query unless the app updates its value. Reset synchronization runs after the browser's default action and is canceled on disposal. Preventing the reset leaves both the DOM value and clear-action state unchanged.

During IME composition, SearchInput keeps the native composition draft visible even when a controlled parent rejects intermediate values. Clearing is disabled until composition ends, when the accepted controlled value resumes ownership. `onValueChange` still receives composing input values; callers that defer searching until commit should use the forwarded native composition/input events. Chromium coverage uses trusted native composition events, not synthetic dispatch. Other browser and OS IME qualification remains part of release testing.

## Checkbox ownership

Checkbox requires a visible `label`; optional description and error text are associated with its native input. `checked` is controlled, `defaultChecked` initializes uncontrolled state, and `onCheckedChange` receives a boolean proposal. `indeterminate` is an independent app-owned presentation flag, so a partial-selection owner must clear it when the selection becomes definite. `ref`, `id`, `class`, and other DOM attributes target the root container; `inputRef` exposes the native input.

Only named, checked, enabled checkboxes contribute form values. Unnamed controls never submit generated internal IDs. Read-only controls retain keyboard focus and their submitted value but reject changes. An uncanceled form reset restores the captured uncontrolled default after the native action and reports a changed value. Controlled values remain app-owned. Canceling reset leaves both state and native checkedness unchanged. Reset listeners and pending callbacks are owner-cleaned.

The checkmark responds to native checkedness before JavaScript arrives. During hydration, the live input value is reconciled on mount: uncontrolled user choices are adopted and reported; controlled changes are proposed to the app, which may accept or reject them. The server DOM and focused input are retained. This handoff does not make application callbacks available before hydration.

Switch uses the same boolean ownership/reset contract for a strictly on/off setting. It exposes native switch semantics, a stable visible label, and no indeterminate state. Keep the label unchanged as the value changes. Its thumb follows native checkedness before hydration and moves toward inline-end when on, including RTL. The component reports changes but does not persist settings or own requests; applications supply that behavior.

## Checkbox groups

CheckboxGroup renders a native fieldset and a required visible legend. `options` have unique stable string values, labels, optional descriptions, and optional disabled flags. `value` is controlled selection; `defaultValue` is captured for uncontrolled reset. Changes emit fresh deduplicated arrays. The group and each option may be disabled; `readOnly` prevents changes without removing focus or submitted values. Validate selection-count requirements in the app and pass `error`, rather than marking every option required.

Options retain their native identities when objects are replaced or reordered. If reconciliation moves a focused control, focus returns to the surviving control without scrolling. Removing it focuses the next enabled option at its former position, then the previous enabled option, then the group if none remain. Deliberate focus moves outside the group take priority. Unknown selected values remain owner state but are not submitted without a rendered, enabled option; applications decide when to prune unavailable choices.

`name` is applied to each input so native FormData contains repeated names for selected options. `form` associates both fieldset and inputs with an external form. Checkbox and Switch also forward `form` to their native input. Uncanceled reset restores uncontrolled defaults; controlled selection remains app-owned. Group instructions and errors are associated with the fieldset, while individual option descriptions remain associated with their checkbox.

## DropdownMenu

Use a required visible trigger label and a readonly tree of action, checkbox, radio-group, separator, and submenu items. IDs must be nonempty and unique among siblings; radio option IDs are unique within their group. Keep IDs stable when refreshing labels, callbacks, or values. Cyclic trees and empty item labels are rejected even while closed. Item IDs are reconciliation keys, not globally shared DOM IDs.

Checkbox and radio values belong to the app. Those items remain open after selection; actions close the menu. Shortcut text is display-only Kbd, not a registered binding. Use menus for actions, not embedded form fields or URL navigation. Initially open content mounts only after the scoped portal is ready, not during SSR.

Submenus inherit effective theme, locale, and direction through scoped portals. The provider stack determines their order. Escape closes the active layer and returns to its trigger; closed content becomes inert and accessibility-hidden during its fast exit animation. See dependency-patches.md for the required upstream compatibility corrections.

## ContextMenu

ContextMenu reuses the DropdownMenu item model on a requested native trigger. Keep a visible path to every action. Empty or disabled replacements leave the browser context menu and touch callout available; consumers must not suppress the event themselves. See `docs/context-menu.md` for row-selection, pending-data, scoped-portal, keyboard, and hydration behavior.

## Tooltip and Popover

Tooltip renders its own native Button-compatible action trigger. Supply button content as children, not another nested button, and provide a visible label or `aria-label`. `content` is noninteractive supporting text; `shortcut` renders Kbd and does not register a binding. Automatic shortcut association remains part of the shortcut-registry task. Disabled/loading triggers do not open help, so essential disabled-state explanations must remain visible elsewhere. Existing `aria-describedby` associations are preserved when tooltip content is added or removed.

Hover opens after `openDelay` (default 500ms); focus opens immediately. `closeDelay` (default 100ms) and the primitive's safe pointer area allow hovering the text itself. Escape dismisses without moving focus; dismissal remains in effect until the trigger is neither focused nor hovered, so pointer movement cannot reopen help during the same focused interaction. Activation retains native button/form behavior. Mount reconciles a trigger focused or hovered before hydration without replacing it. The tooltip is not a place for interactive content; use Popover instead.

Popover has a native labeled trigger, required title, optional description, and controlled/uncontrolled open ownership. It is nonmodal, supports outside interaction and nested single-layer Escape, and preserves externally chosen focus on outside dismissal. Refreshing a description or app-owned body state must not replace surviving inputs or drafts. Its portal is client-mounted when the nearest theme target is ready, with delayed-click replay covered by the browser fixture.

Both layers register in the provider stack, retain their layer position during exit, and use the top-layer marker so enclosing dialogs do not hide their content. Exiting layers are removed from accessible descriptions/roles immediately; interactive popover content becomes inert during its visual fade. Enter/exit uses fast-duration tokens, with zero-duration reduced motion. Tooltip uses raised elevation, Popover overlay elevation, and both inherit scoped colors and direction.

## Dialogs and confirmation

Dialog supports controlled `open`/`onOpenChange` or uncontrolled `defaultOpen`, an optional native trigger, optional description, and app-owned footer actions. Content mounts into the contextual theme portal when that target is ready; initially open portals are client-mounted, not server-rendered modal HTML. Closed native triggers participate in the documented hydration replay contract. Modal content owns its raised-surface focus offset, bounded scrolling, RTL positioning, and normal-duration enter/exit fade. Layout triggers never mount-animate, and reduced motion removes the fade.

`initialFocus` resolves a target inside the mounted dialog; an invalid, disabled, disconnected, or unfocusable target falls back to primitive focus management. `returnFocus` is useful for triggerless controlled modals. `dismissible={false}` prevents Escape, outside press, and the built-in close action while the app retains authority to set controlled `open={false}`. Rejected controlled close requests do not dispose the content or lose drafts.

AlertDialog requires a description, never dismisses on outside press, and defaults initial focus to its safe close action. Use `closeLabel` to name that decision. ConfirmDialog provides localized safe/affirmative actions and emits callbacks only; it does not own app data or start a commit operation.

Call `createConfirm()` inside a Solid owner and mount its returned `<controller.Dialog />` once within that owner's theme scope. Await `controller.confirm({ title, description, confirmLabel, cancelLabel, tone, signal })` to obtain a boolean decision. Affirmative action resolves true; safe action, Escape, AbortSignal, or owner disposal resolves false. Aborted/disposed requests never open UI. One controller supports one unanswered request; overlap rejects without replacing the first prompt. Use separate scoped controllers for genuinely separate workflows. The controller snapshots options, removes abort listeners on settlement, retains closing content for its visual exit, and restores a surviving opener. Consumers own subsequent async work and errors.

## Select

Select is a single-choice button/listbox, not editable autocomplete or multi-selection. Its public values are unique nonempty strings. `undefined` value selects uncontrolled ownership; `null` is controlled empty selection. The captured `defaultValue` is restored only on uncanceled uncontrolled form reset. Controlled owners may reject requests. Disabled fields do not submit; read-only fields retain their value and allow inspection.

The wrapper supplies stable server label/value/description IDs, native form participation, external `form` association, and required-validation focus redirection to the visible trigger. The localized empty prompt is `messages.selectOption`. A hidden native select supports form serialization, not a pre-JS interactive fallback. The real delayed-JS fixture verifies that the first queued trigger click opens after hydration and reuses the server trigger.

Overlays resolve the nearest theme portal and participate in the provider layer stack. Kobalte's top-layer marker protects the popup from an enclosing dialog's hide-outside processing. Scope and nested Escape behavior must be tested in a real browser. Enter/exit fades use the fast-duration token and become zero-duration under reduced motion; the layout control never animates on mount.

Options render with stable value keys. The Kobalte custom-children path is internally named `virtualized`, but this Select renders every option, with no performance-virtualization claim. Reconciliation callbacks are not user intent: refreshing options must neither dismiss the popup nor clear owner selection. Unavailable values show the empty prompt and submit an empty value until restored. Surviving focused nodes are retained; removal chooses the next enabled option, then previous, then the empty listbox. Do not steal a deliberate external focus move.

## Comboboxes

Combobox and MultiCombobox commit stable option values, not query text. Use their built-in `contains`, `startsWith`, or `endsWith` label filter for a complete local option set. For remote search, set `filter={false}` and let the app own debounce, cancellation, monotonic request tokens, parsing, and authorization. Set `pending` before the request and publish one coherent `options` replacement only after its response wins. The wrapper retains the prior accepted option nodes, marks the field busy, and prevents selection from stale results. A cold request shows loading without inventing options. `resultsError` and `onRetry` describe transport state; `error` remains field validation.

Previously seen options are cached by value so selected values and MultiCombobox tags survive a filtered result subset. A selected value that has never appeared is rejected because it has no trustworthy label. Option values and labels are nonempty; values and multi-selection entries are unique. MultiCombobox removal remains available during a result request because it changes committed selection, not the pending result query.

Both controls emit explicit input-label-description relationships in server markup and keep the native input node and pre-hydration draft. Popups use the nearest theme portal. Mouse selection keeps the input focused through pointer-up so a blur cannot reset and reorder a filtered list underneath the pointer. Single values serialize through Kobalte's native select. MultiCombobox owns a native multi-select projection because every committed value, not only the current query or one selected item, must appear in FormData; its empty query input is not itself required.

TagInput applies the same projection rule to ordered free-form strings. Enter or comma validates the retained native draft, Backspace on an empty editor removes the last value, and each removal button supports Delete plus Alt-arrow/Home/End reordering. Async validation receives an AbortSignal and accepted-value snapshot; a monotonic revision rejects stale completion even if cancellation is ignored. Pending and failure states retain accepted tag nodes and the draft. Use MultiCombobox when the domain is a known option set.

## Radio groups

RadioGroup is a native fieldset with radio-group semantics, a required visible legend, and exactly one selected value at most. Supply a nonempty `name`, distinct from other radio groups in the same form, so native exclusivity works before JavaScript. Option values must be unique and nonempty. `value` controls selection, `null` explicitly clears it, and `defaultValue` initializes uncontrolled selection. `required` uses native one-of-group validation. Use CheckboxGroup for independent selections and a toolbar-specific pattern for toolbar toggles.

Labels, descriptions, and errors use explicit stable IDs in server HTML, not post-mount registration. Native pre-hydration choices are adopted for uncontrolled groups and proposed to controlled owners, which may accept or reject them. Read-only and disabled choices cannot change selection. Reset restores the captured uncontrolled default after native cancellation handling; controlled state stays app-owned. `form` also supports externally associated inputs.

Tab enters at the selected enabled option, or the first enabled option when none is selected. Native arrows move and select, skipping disabled options and wrapping; horizontal navigation follows RTL direction. Replacing or reordering options retains keyed native identities. Focus restoration/removal fallback uses the same behavior as CheckboxGroup, without changing selection merely because focus was restored. An unavailable selected value remains owner state but contributes no native form value; the app decides when to clear or replace it. `orientation` controls layout and ARIA orientation.
