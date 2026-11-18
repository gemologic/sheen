---
"@gemologic/sheen": patch
---

Closing a popover or dialog before its open autofocus has run now returns focus to the trigger. Focus that stayed on the element that held it at open is no longer treated as a deliberate move elsewhere, so a quick Escape after a mouse-opened Popover lands back on its trigger instead of the previously focused control.
