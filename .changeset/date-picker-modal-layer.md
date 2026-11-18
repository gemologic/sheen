---
"@gemologic/sheen-date": patch
---

`DatePicker` and `DateRangePicker` popups now join Sheen's overlay layer contract when opened inside a modal `Dialog`, `Drawer`, or `Sheet`. Previously the modal's focus trap refused focus inside the calendar, so keyboard date selection was impossible and Escape returned focus to the input instead of the calendar trigger, and the modal's outside-content hiding left the open calendar `aria-hidden`. The calendar now receives focus, stays exposed to assistive technology, closes alone on the first Escape with focus back on its trigger, and leaves the modal open until a second Escape.
