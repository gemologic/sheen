# @gemologic/sheen-tokens

Validated themes, twelve independent accent presets, self-hosted IBM Plex fonts, and semantic tokens for Sheen. Dark Obsidian with jade is the fresh-install default. Private themes can use the exported compiler without forking the package.

## Install

```sh
pnpm add @gemologic/sheen-tokens
```

## Use

Import the complete bundled token surface before component styles:

```css
@import "@gemologic/sheen-tokens/fonts.css";
@import "@gemologic/sheen-tokens/themes.css";
@import "@gemologic/sheen-tokens/core.css";
```

Applications using Tailwind may additionally import `@gemologic/sheen-tokens/preset.css`. Individual `themes/*` and `accents/*` entries are available when an application deliberately owns its CSS selection. Private build tooling can import `defineTheme` and `buildTheme` from the package root and receives the same validation used for bundled themes.

See the [theme authoring guide](https://github.com/gemologic/sheen/blob/main/docs/private-themes.md) and [font policy](https://github.com/gemologic/sheen/blob/main/docs/fonts.md). The bundled font files retain their SIL Open Font License and pinned source record under `dist/fonts/`.
