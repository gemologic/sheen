# @gemologic/sheen

Accessible, themeable SolidJS components for application interfaces. Import the component entry that matches the feature set you use, plus `@gemologic/sheen/styles.css` and the selected token CSS from `@gemologic/sheen-tokens`.

## Install

```sh
pnpm add @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load the styles once at the application root:

```css
@import "@gemologic/sheen-tokens/fonts.css";
@import "@gemologic/sheen-tokens/themes.css";
@import "@gemologic/sheen-tokens/core.css";
@import "@gemologic/sheen/styles.css";
```

## Use

```tsx
import { Button, ThemeProvider } from "@gemologic/sheen";

export function App() {
  return <ThemeProvider><Button>Continue</Button></ThemeProvider>;
}
```

Fresh providers default to dark Obsidian with a jade accent. Import `./core`, `./forms`, `./overlays`, or `./navigation` when an application needs a deliberately narrower entry. Server markup, hydration, contextual portals, focus, and retained-refresh behavior are public contracts, not client-only enhancements.

See the [Sheen repository](https://github.com/gemologic/sheen), [hydration guide](https://github.com/gemologic/sheen/blob/main/docs/hydration.md), and [component inventory](https://sheen.gemologic.dev/components) for complete examples and support policy.
