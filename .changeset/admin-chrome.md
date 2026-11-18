---
"@gemologic/sheen": minor
"@gemologic/sheen-patterns": minor
---

Shell chrome. The AdminApp topbar command trigger reads as a search field ("Search or jump to…" with a search glyph and ⌘K) and collapses to the shortcut on narrow screens. The active sidebar item gains an accent marker in the default navigation style. A sidebar with a single section keeps its heading for assistive technology but no longer shows it. PageHeader titles use the h3 size, and h1–h3 headings use `text-title-tracking`. DataTablePage applies one inline gutter to its header, toolbar, table toolbar, and status row while the grid stays full-bleed. ListDetailLayout list items no longer show bullets: the reset targeted a direct child that ScrollArea wraps.

`Link` gains `variant="quiet"`: foreground color with the underline on hover and focus, for table cells, lists, and navigation where position already marks a link.
