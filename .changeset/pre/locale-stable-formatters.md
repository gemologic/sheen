---
"@gemologic/sheen": patch
"@gemologic/sheen-charts": patch
---

Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
