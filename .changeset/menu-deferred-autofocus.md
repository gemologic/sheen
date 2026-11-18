---
"@gemologic/sheen": patch
---

Menus, submenus, and other list popups no longer pull focus back after keyboard navigation on a busy page. Each popup's deferred open autofocus is skipped when focus has already moved elsewhere while it waited, so quickly arrowing into a submenu keeps focus on the item you reached.
