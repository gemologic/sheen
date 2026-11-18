# @gemologic/sheen-icons

Build-time-selectable icon sets for Sheen SolidJS applications. Literal icon names are statically analyzable; `DynamicIcon` is the explicit full-registry escape hatch.

## Install

```sh
pnpm add @gemologic/sheen-icons solid-js
```

## Use

For the smallest portable import, use a generated semantic icon directly:

```tsx
import { SearchIcon } from "@gemologic/sheen-icons/icons/search";
import "@gemologic/sheen-icons/styles.css";

export function SearchMark() {
  return <SearchIcon decorative={false} label="Search" />;
}
```

The `./vite` entry transforms literal `<Icon name="search" />` usage so only referenced Radix and Phosphor glyphs are retained. A dynamic name must use `DynamicIcon`, which intentionally includes the runtime registry. Bundles may select at most two icon sets.

The catalog has 257 intent-based names across navigation, actions, files, communication, media, commerce, data, devices, development, status, people, text formatting, layout, time, location, and brands. Names without Radix artwork render their Phosphor glyph in Radix themes.

See the [icon guide](https://github.com/gemologic/sheen/blob/main/docs/icons.md) for the full catalog, Vite configuration, the Radix fallback, semantic naming, meaningful labels, and the two-set boundary.
