# Semantic icons

Sheen exposes 257 application-oriented icon names backed by Radix Icons and Phosphor. Applications choose semantic names, while theme metadata chooses the artwork. Obsidian, Paper, Contrast, Slate, and Graphite use Radix; Vellum and Studio use Phosphor. A bundle may contain one or two sets.

## Catalog

Names describe intent, not artwork: `logout` rather than `signOut`, `alert` rather than `exclamationCircle`. Each name exports a `<Name>Icon` component and an `@gemologic/sheen-icons/icons/<kebab-name>` entry, for example `GitBranchIcon` from `@gemologic/sheen-icons/icons/git-branch`. `iconNames` lists every name at runtime, and `packages/icons/src/registry.ts` maps each one to its source glyphs.

- Core: `add`, `remove`, `close`, `check`, `settings`, `search`, `chevronDown`, `chevronUp`, `chevronLeft`, `chevronRight`, `arrowLeft`, `arrowRight`, `arrowUp`, `arrowDown`, `menu`, `moreHorizontal`, `moreVertical`, `filter`, `sortAscending`, `sortDescending`, `refresh`, `download`, `upload`, `edit`, `trash`, `copy`, `externalLink`, `info`, `warning`, `error`, `success`, `calendar`, `clock`, `user`, `users`, `home`, `inbox`, `notifications`, `lock`, `unlock`, `visible`, `hidden`
- Navigation and direction: `arrowUpRight`, `chevronsUpDown`, `chevronDoubleLeft`, `chevronDoubleRight`, `login`, `logout`, `expand`, `collapse`, `dragHandle`, `move`, `swap`, `sort`, `dashboard`, `sidebar`, `compass`, `globe`, `help`, `command`, `keyboard`
- Actions: `addCircle`, `removeCircle`, `undo`, `redo`, `history`, `link`, `unlink`, `share`, `export`, `send`, `save`, `print`, `cut`, `clipboard`, `compose`, `archive`, `pin`, `unpin`, `bookmark`, `bookmarkFilled`, `star`, `starFilled`, `heart`, `heartFilled`, `flag`, `tag`, `zoomIn`, `zoomOut`, `sliders`, `blocked`, `sparkle`, `lightning`, `rocket`, `wrench`, `extension`, `power`, `qrCode`
- Files and documents: `file`, `fileText`, `fileAdd`, `fileRemove`, `fileCode`, `fileImage`, `filePdf`, `fileCsv`, `fileArchive`, `folder`, `folderOpen`, `folderAdd`, `attachment`, `note`, `book`, `package`
- Communication: `mail`, `mailOpen`, `chat`, `comment`, `reply`, `forward`, `phone`, `at`, `hash`, `quote`, `megaphone`, `notificationsOff`, `bot`, `microphone`, `microphoneOff`, `headset`, `translate`
- Media: `image`, `camera`, `video`, `play`, `pause`, `stop`, `skipForward`, `skipBack`, `volume`, `volumeLow`, `mute`, `music`
- Commerce and billing: `cart`, `store`, `creditCard`, `wallet`, `receipt`, `bank`, `currencyDollar`, `currencyEuro`, `percent`, `gift`, `truck`
- Data and charts: `barChart`, `lineChart`, `pieChart`, `donutChart`, `trendUp`, `trendDown`, `activity`, `gauge`, `table`
- Devices and connectivity: `desktop`, `laptop`, `mobile`, `tablet`, `cpu`, `wifi`, `wifiOff`
- Development and infrastructure: `code`, `codeBlock`, `terminal`, `gitBranch`, `gitCommit`, `gitMerge`, `gitPullRequest`, `gitFork`, `gitDiff`, `bug`, `database`, `server`, `cloud`, `cloudUpload`, `cloudDownload`, `cloudOff`, `key`, `api`, `webhook`, `hierarchy`, `workflow`, `network`, `layers`, `logs`, `shield`, `shieldCheck`
- Status: `alert`, `pending`, `verified`, `lightbulb`
- People and organizations: `account`, `userAdd`, `userRemove`, `userCheck`, `contacts`, `idCard`, `organization`, `legal`, `briefcase`, `emoji`, `thumbsUp`, `thumbsDown`, `accessibility`
- Editing and text formatting: `bold`, `italic`, `underline`, `strikethrough`, `heading`, `text`, `clearFormatting`, `alignLeft`, `alignCenter`, `alignRight`, `alignJustify`, `bulletList`, `numberedList`, `checklist`, `indent`, `outdent`, `highlight`, `palette`
- Layout: `layout`, `gridView`, `listView`, `columns`, `kanban`
- Weather and time: `sun`, `moon`, `cloudRain`, `snowflake`, `timer`, `calendarAdd`, `calendarCheck`
- Maps and location: `mapPin`, `map`, `navigate`, `building`
- Brands and social: `githubLogo`, `gitlabLogo`, `googleLogo`, `appleLogo`, `windowsLogo`, `linkedinLogo`, `xLogo`, `discordLogo`, `slackLogo`, `youtubeLogo`

Brand marks keep a `Logo` suffix so they are never mistaken for an action. Use them to identify the service, for example on a sign-in button, and follow each brand's own usage rules.

## Missing Radix artwork

Phosphor covers every name. Radix Icons has about 340 glyphs, so 113 names have no Radix entry; they are the registry entries that list only `phosphor`. For those names the build emits the Phosphor glyph under the Radix set tag, so a Radix theme shows the Phosphor artwork. The fallback is resolved once, at build time, from `fallbackIconSet`; every name therefore has exactly one glyph per set in the generated catalog, the per-icon exports, and the literal transform, and no lookup can produce a missing glyph. The Radix entry reuses the Phosphor object, and the literal transform emits a shared path once, so the fallback does not duplicate path data in JavaScript. Server markup still carries one SVG per selected set, which keeps the theme switch a pure CSS change. Phosphor's regular weight is close to Radix's stroke at 14–20px, but the shapes are not identical; review a Radix screen that mixes fallback names if the difference matters there. Each per-icon `.meta.ts` summary states whether the icon has Radix artwork.

## Adding a name

Add an intent-based camelCase entry to `packages/icons/src/registry.ts` with a regular-weight Phosphor glyph and, when a faithful one exists, a Radix glyph, then run `pnpm --filter @gemologic/sheen-icons generate`. The generator rejects missing glyphs, script or event markup, and `href` references (some Radix panel glyphs use `<use href>` and fall back to Phosphor for that reason). It writes the data module, the component, its `.meta.ts`, and its demo, and removes files for deleted names. Keep `eslint-plugin-sheen`'s semantic name list in step; its fixture compares the two.

Sheen deliberately has no `__unsafe_*` escape hatch for raw Phosphor names. Resolving an arbitrary name at build time would need the Phosphor collection as a runtime dependency of every consumer, a runtime lookup would ship the whole collection, and a raw glyph has no Radix counterpart, so it would bypass theme-selected artwork. A missing glyph is a registry addition.

## Import paths

Use the Vite marker when the name is a literal:

```tsx
import { Icon } from "@gemologic/sheen-icons";

<Icon name="search" />
```

Configure the transform with every set used by the bundled themes:

```ts
import { sheenIcons } from "@gemologic/sheen-icons/vite";

sheenIcons({ sets: ["radix", "phosphor"] })
```

The transform rejects unknown literal names and embeds only the selected variants for names present in source. Build systems without the plugin use a per-icon export:

```tsx
import { SearchIcon } from "@gemologic/sheen-icons/icons/search";
```

When runtime data selects from a known handful of icons, map the values to per-icon components. When the name genuinely arrives at runtime, from a server or a schema, use `LazyIcon`:

```tsx
import { LazyIcon, preloadIcons } from "@gemologic/sheen-icons/lazy";

<LazyIcon name={field.icon} />
```

`LazyIcon` resolves one name at a time. A generated loader map holds one dynamic import per name, pointing at that name's glyph data module, so only the map and the shared icon runtime reach the entry chunk: about 5.7KB gzip, or 8.0KB with the lucide aliases below, against about 58KB for `DynamicIcon`. Each glyph is its own small chunk, fetched once and cached. The loader map's keys are also the validation set, so the check needs no registry data and rejects inherited object names such as `constructor`.

Server markup is deterministic. A name that has not been preloaded renders the normal icon root with `data-sheen-icon-state="loading"` and no SVG; CSS reserves the icon size, so nothing shifts when the glyph arrives. After mount the client imports the glyph and fills that same root, keeping its node identity, id, and accessible name. To paint the glyph on first render, `await preloadIcons(names)` with the same names on the server and in the client entry before `hydrate`; both sides then render the resolved glyph. Preloading on one side only produces mismatched hydration markup. An unknown name never throws: it renders a sized dashed marker with `data-sheen-icon-state="unknown"`, keeps any supplied label, and loads nothing. A failed chunk request shows the same marker with `data-sheen-icon-state="error"`, and a later mount retries. A name change rerenders from the current name, so a late response for an old name only fills the cache.

`DynamicIcon` remains the explicit full-registry path: it renders synchronously with no loading state, throws on unknown names, and retains about 58KB gzip for 257 names.

## Lucide names

Apps migrating from lucide often have stored lucide names. `resolveLucideIconName(name)` from `@gemologic/sheen-icons/lucide` (also the root entry) maps a lucide kebab-case name to the Sheen name with the same intent, or returns `undefined`; `lucideIconAliases` is the typed map itself:

```tsx
<LazyIcon name={resolveLucideIconName(stored) ?? stored} />
```

The repository has no lucide data, so the map is explicit rather than generated. It has 292 aliases, current names plus common legacy ones such as `alert-triangle` and `edit`, covering 246 of the 257 Sheen names. The filled variants, `filePdf`, `donutChart`, `hierarchy`, `organization`, and the Google, Apple, Windows, and Discord logos have no lucide counterpart. Lucide names without a Sheen intent, such as spinners, shapes, and most brand marks, resolve to `undefined`. A test checks that every target is a registry name; the alias keys come from the lucide catalog as of late 2026 and are not checked against lucide's data. PascalCase component names such as `Trash2` are not accepted; convert them to lucide's kebab-case names first.

## Accessibility and sizing

Icons are decorative by default and emit `aria-hidden="true"`. A meaningful icon sets `decorative={false}` and supplies a nonempty `label`; runtime validation rejects an empty label. An icon next to button text normally stays decorative because the button text already supplies the accessible name.

`size="sm"`, `md`, and `lg` resolve to 14px, 16px, and 20px tokens. Resting icons use muted foreground color. `tone="inherit"` is for interactive parents, and button composition inherits `currentColor` automatically.

## Theme and hydration handoff

Both selected SVGs are present in deterministic server markup. CSS displays exactly one based on the nearest `data-sheen-icon-set` attribute, so theme changes do not remount the icon or replace surrounding component state.

Client hydration stamps the root icon set in the blocking prepaint script from the stored theme. Cookie hydration emits it from the authoritative request state. `ThemeScope` stamps the same value on its wrapper and contextual portal before hydration, then keeps both reactive. This prevents the default set from flashing during refresh, hydration, or scoped overlay mounting.

The isolated consumer gate proves literal imports exclude unrelated glyphs, per-icon imports tree-shake unrelated data, `LazyIcon` keeps every glyph and the registry out of its entry chunk, and `DynamicIcon` includes the full registry, each against the gzip ceilings in [bundle budgets](bundle-budgets.md). Browser coverage samples every animation frame during a live set change and delays application JavaScript to inspect the pre-hydration result.
