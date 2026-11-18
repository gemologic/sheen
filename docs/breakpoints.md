# Breakpoints

`@gemologic/sheen-tokens` exports one viewport scale. Component and application CSS uses these widths instead of ad-hoc pixel values.

| Name | Width | Pixels at a 16px default | Typical role |
| --- | --- | --- | --- |
| `xs` | `22.5rem` | 360 | Smallest supported phones; icon-only fallbacks below it |
| `sm` | `40rem` | 640 | Large phones, narrow split panes |
| `md` | `48rem` | 768 | Tablet portrait; the mobile/desktop shell switch |
| `lg` | `64rem` | 1024 | Tablet landscape, narrow laptops; persistent side panels |
| `xl` | `80rem` | 1280 | Wide desktop layouts |

Widths are rem so a layout switches at the same reading width when people raise their default font size. Inside a media query, `rem` resolves against the browser's initial font size, not the root element, so theme typography and density never move breakpoints.

## Canonical queries

Use media-query range syntax. `up` is `>=` and `down` is strict `<`, so the two sides of one breakpoint never overlap and never leave a gap, which removes the `767px`/`47.999rem` workarounds:

```css
@media (width < 48rem) { /* below md: mobile */ }
@media (width >= 48rem) { /* md and up */ }
```

CSS custom properties cannot appear in `@media` conditions, and `@custom-media` is not supported by browsers or by Sheen's build, so CSS spells the rem value directly. Use exactly the values in the table.

## TypeScript

```ts
import { breakpointQuery, breakpoints } from "@gemologic/sheen-tokens";

breakpoints.md;                 // "48rem"
breakpointQuery("md");          // "(width >= 48rem)"
breakpointQuery("md", "down");  // "(width < 48rem)"
```

`breakpointQuery` is a pure string builder, safe on the server. Pass its result to `matchMedia` only on the client, and keep server markup complete: CSS owns responsive layout, and script-driven responsive behavior must render the same markup on the server and the client's first frame before reacting to `matchMedia`.

Container queries size against their container, not the viewport, and keep component-specific widths.
