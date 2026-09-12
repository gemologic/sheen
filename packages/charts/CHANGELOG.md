# @gemologic/sheen-charts

## 0.1.0-rc.1

### Patch Changes

- 4c53735: Reuse number/date formatters and SVG chart models across color-only theme changes. Locale changes still rebuild localized formatting. Read each requested theme token only once per scope redraw, even when many charts subscribe. Tighten production benchmark sampling and scoped revision checks without changing performance budgets or baselines.
- Updated dependencies [4c53735]
- Updated dependencies [4c53735]
  - @gemologic/sheen@0.1.0-rc.1

## 0.1.0-rc.0

### Minor Changes

- a46a080: Publish the first Sheen release-candidate line with dark-first themes, accessible application primitives, compact AdminApp patterns, data tables, date controls, charts, code viewers, semantic icons, lint rules, scaffolding, and generated agent guidance.

### Patch Changes

- 293072e: Retain AdminApp action controls by group/action ID, StatusBar counts by label, and StatGroup metric positions when accepted data replaces model objects. Resolve inline stat definitions once and keep color-only theme changes out of status number formatting.
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
- Updated dependencies [a46a080]
  - @gemologic/sheen@0.1.0-rc.0
