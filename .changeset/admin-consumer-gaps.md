---
"@gemologic/sheen": patch
"@gemologic/sheen-patterns": patch
"@gemologic/sheen-date": patch
"@gemologic/sheen-code": patch
"@gemologic/sheen-icons": patch
---

Gaps found while porting an embedded admin to 0.4.0.

- `Checkbox` and `Switch` put a passed `aria-describedby` on the native input, merged with the description and error, instead of on the root container. With `TooltipTrigger`, pass `inputRef={trigger.ref}` and `aria-describedby={trigger["aria-describedby"]}`.
- `AdminNavigationGroup` declares `defaultOpen`, which `AdminApp` already forwarded to `SidebarNav`.
- `@gemologic/sheen-date/styles.css` uses `@layer components` like every other Sheen stylesheet. It was in `sheen.components`, a separate top-level layer that outranked `utilities`.
- `@gemologic/sheen-code/languages` adds `go`, `rust`, and `toml`.
- `resolveLucideIconName` maps `building-2`, `scroll`, `scroll-text`, and `table-2`.
