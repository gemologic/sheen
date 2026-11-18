---
"@gemologic/sheen-tokens": minor
"@gemologic/sheen-cli": minor
---

Custom brand accents: `defineAccent({ id, seed })` derives light and dark accent, subtle, hover, active, and focus-ring values from one brand color, moving only OKLCH lightness until every supplied theme passes contrast (bundled themes by default). Explicit `{ id, light, dark, lightSubtle?, darkSubtle? }` definitions are validated and throw `ThemeValidationError` instead of being adjusted. `buildAccent` now accepts a defined accent and an optional `themes` list, and emits the same selectors and Contrast override as the bundled accents; `validateAccent` returns the diagnostics without throwing. Accent build failures are now `ThemeValidationError`. `sheen new accent <name>` scaffolds a definition.

Breakpoints: `breakpoints` (`xs` 22.5rem, `sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem) and `breakpointQuery(name, "up" | "down")` give one viewport scale with non-overlapping range queries. The app scaffold's mobile query now uses `(width < 48rem)`.
