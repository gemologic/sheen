---
"@gemologic/sheen-patterns": patch
---

A failed AdminApp or AppShell deferred overlay load (command palette, shortcut sheet) no longer surfaces as an unhandled rejection. The trigger keeps working and the next hover, focus, or shortcut retries the load.
