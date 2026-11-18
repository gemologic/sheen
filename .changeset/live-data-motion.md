---
"@gemologic/sheen": minor
"@gemologic/sheen-table": minor
"@gemologic/sheen-charts": minor
---

Live data motion. `NumberText` gains `flash` (tints up or down with the market colors when the value changes) and `tween` (counts from the previous value). `Stat` tweens numeric values on update by default (`tween={false}` opts out). DataTable accessor columns accept `flash: true` to tint a numeric cell when its value changes for the same row. `flashChange(element, direction)` is exported for custom renderers. Nothing animates on the first render, and reduced motion disables all of it. Skeletons shimmer while they wait (static under reduced motion).
