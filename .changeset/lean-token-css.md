---
"@gemologic/sheen-tokens": minor
---

Theme CSS no longer repeats every token inside `@supports (color: oklch(...))`. `buildTheme` now emits that block only for color tokens whose authored value the sRGB hex fallback cannot reproduce exactly, such as wide-gamut OKLCH, and never repeats non-color tokens. Bundled themes are sRGB-exact and ship no override block, roughly halving their gzip size.

Tier-one primitive ramps (`--sheen-gray-*`, `--sheen-size-*`, `--sheen-radius-*`, `--sheen-font-size-*`, and the other color ramps) moved out of `core.css` into the new opt-in `@gemologic/sheen-tokens/primitives.css` export, exposed in code as `buildPrimitives()`. Themes already ship resolved semantic values, so applications only need it for token tooling. `core.css` keeps the `--sheen-z-*` and `--sheen-shadow-*` layering primitives that component CSS still reads. Import `primitives.css` if your own CSS references a tier-one ramp variable.
