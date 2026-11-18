---
"@gemologic/sheen-tokens": minor
"@gemologic/sheen": patch
"@gemologic/sheen-table": patch
"@gemologic/sheen-patterns": patch
---

Surface and depth retune. Obsidian dark widens the steps between base, raised, and interaction surfaces; control borders across every theme drop to the softest value that still clears 3:1 against all seven surfaces; light Obsidian's selected fill is neutral instead of indigo. Elevations are now layered (inner top highlight, contact shadow, ambient shadow) with lighter light-mode values, and raised surfaces carry `elevation-raised` by default. Modal and command overlays blur what they cover.

The focus ring now follows the selected accent (Contrast keeps its black or white ring). Components still read only `color-focus-ring`, so a private theme or scope can pin it independently.

Fixes: table and filter-bar focus outlines referenced undefined tokens and rendered nothing; menu item descriptions and admin account subtitles referenced an undefined type size; drawers stretched their header, body, and footer to fill the viewport instead of scrolling the body.
