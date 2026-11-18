---
"@gemologic/sheen": minor
"@gemologic/sheen-charts": minor
---

Component chrome.

- **TimeSeries** puts its legend and icon zoom controls in a header row beside the title, and no longer draws the x-axis title on the canvas: `xLabel` still names the native table column and the screen-reader context. The plot is about 85px shorter for the same `height`. The new `area` prop fills under the first series with a fading gradient, and `live` marks the latest sample of each visible series with a pulsing dot (static under reduced motion).
- **Pagination** first, previous, next, and last controls are icon buttons that keep their localized accessible names and mirror in right-to-left scopes.
- **Dialog, Drawer, Sheet, and Popover** close from a corner icon placed last in tab order. An explicit `closeLabel`, or an alert dialog, keeps the labelled footer action. Toasts dismiss from an icon button.
- **Select** uses a chevron that turns when the list opens, and a check glyph for the selected option.
- **Tabs** gain a sliding accent indicator, and **SegmentedControl** slides its selected fill between options. The server-rendered selected styling stays until the indicator has measured.
