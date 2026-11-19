---
"@gemologic/sheen-icons": minor
---

Add `LazyIcon` for icon names that arrive at runtime. It loads one glyph at a time through a generated per-name dynamic import, so the entry costs about 5.7KB gzip instead of `DynamicIcon`'s 58KB. Server markup renders a sized `data-sheen-icon-state="loading"` placeholder, or the glyph when the name was awaited with `preloadIcons`, and the client fills that same root after mount. Unknown names render a visible dashed marker instead of throwing. New `./lazy` and `./lucide` entries; `resolveLucideIconName` and `lucideIconAliases` map 292 common lucide names onto 246 Sheen names. Each generated glyph data module now also exports `glyphs`.
