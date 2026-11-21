---
"@gemologic/sheen": patch
---

Closing a pointer-opened Select, Popover, or menu no longer pulls focus to its trigger when the user moved focus back to the field they were in before opening it. Previously, picking an option and then returning to a textarea before the close animation finished sent focus to the Select trigger once the animation ended. A quick Escape before any focus moves still returns to the trigger.
