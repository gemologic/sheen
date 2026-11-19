---
"@gemologic/sheen-patterns": minor
---

AdminApp defers the command palette and AppShell defers the keyboard shortcut sheet into client-only chunks that preload on idle or trigger intent. Their triggers still render on the server, a first Ctrl/Cmd+K or `?` press is queued until the chunk arrives, and closing the palette returns focus to its opener. The Admin first-paint chunk drops from 79.3 KB to 74.4 KB gzip, with 8.2 KB gzip deferred.

`primaryNavigation` and `secondaryNavigation` now also accept an ordered array of navigation models, so the sidebar or topbar can render any number of labeled sections. A single model still works unchanged.
