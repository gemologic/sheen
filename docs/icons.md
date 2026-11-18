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

Use `DynamicIcon` only when the name genuinely arrives at runtime. It validates the name and intentionally retains the complete registry, about 58KB gzip for 257 names, making that bundle cost visible in source. When runtime data selects from a known handful of icons, map the values to per-icon components instead.

## Accessibility and sizing

Icons are decorative by default and emit `aria-hidden="true"`. A meaningful icon sets `decorative={false}` and supplies a nonempty `label`; runtime validation rejects an empty label. An icon next to button text normally stays decorative because the button text already supplies the accessible name.

`size="sm"`, `md`, and `lg` resolve to 14px, 16px, and 20px tokens. Resting icons use muted foreground color. `tone="inherit"` is for interactive parents, and button composition inherits `currentColor` automatically.

## Theme and hydration handoff

Both selected SVGs are present in deterministic server markup. CSS displays exactly one based on the nearest `data-sheen-icon-set` attribute, so theme changes do not remount the icon or replace surrounding component state.

Client hydration stamps the root icon set in the blocking prepaint script from the stored theme. Cookie hydration emits it from the authoritative request state. `ThemeScope` stamps the same value on its wrapper and contextual portal before hydration, then keeps both reactive. This prevents the default set from flashing during refresh, hydration, or scoped overlay mounting.

The isolated consumer gate proves literal imports exclude unrelated glyphs, per-icon imports tree-shake unrelated data, and `DynamicIcon` includes the full registry, each against the gzip ceilings in [bundle budgets](bundle-budgets.md). Browser coverage samples every animation frame during a live set change and delays application JavaScript to inspect the pre-hydration result.
