---
"@gemologic/sheen": minor
---

Loading `Button`s (and `IconButton`/`Tooltip` triggers) stay focusable. They expose `aria-disabled="true"` and `aria-busy="true"` instead of the native `disabled` attribute, and suppress clicks, keyboard activation, and implicit form submission until loading ends.
