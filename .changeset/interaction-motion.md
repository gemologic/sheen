---
"@gemologic/sheen": minor
"@gemologic/sheen-table": patch
---

Interaction states now transition instead of snapping: buttons, inputs, checkboxes, radios, segmented items, nav and tree items, and table rows ease their color, border, and shadow changes, and input/choice borders brighten on hover. These transitions run only while a control is hovered, focused, or pressed: theme, mode, layout, and data-driven restyles apply at once instead of cross-fading every control, and selecting a table row paints immediately. Select menus open with a quick fade, the Select trigger changes state without a border transition, input focus rings appear at once, and the Select chevron rotates with a compositor-friendly `transform`. Switch is a pill whose thumb slides (and squashes slightly on press); checkbox and radio marks spring in. Menu items and select options show the highlighted item with a fill and a 2px focus-ring bar on the inline-start edge instead of a full outline. Spinners use the new `duration-spin` token (800ms) instead of a 250ms turn.
