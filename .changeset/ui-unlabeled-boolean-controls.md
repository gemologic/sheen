---
"@gemologic/sheen": minor
---

`Checkbox` and `Switch` accept `aria-label` or `aria-labelledby` instead of a visible `label`, for table cells and other places where a visible label would repeat nearby text. The props type requires exactly one of the three. The native input is now the pointer hit target over the decorative indicator, so a plain click works before and after hydration without a test helper.
