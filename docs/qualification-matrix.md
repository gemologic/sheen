# Qualification matrix

Sheen uses a bounded application matrix instead of taking a screenshot of every possible axis combination. Component suites retain their focused keyboard, RTL, state, and visual coverage. The application matrix then covers the cross-system seams with four deliberately different AdminApp configurations:

| Case | Preset | Viewport | Direction | Theme and mode | Accent |
| --- | --- | --- | --- | --- | --- |
| Standard desktop | standard | 1280 by 800 | LTR | Obsidian dark | Jade |
| Workspace tablet | workspace | 768 by 1024 | RTL | Paper light | Rose |
| Horizontal phone | horizontal | 390 by 844 | LTR | Slate dark | Amber |
| Inspector reflow | inspector | 320 by 700 | RTL | Contrast light | Blue |

Every case must render without document overflow, expose a visible keyboard target, pass the automated WCAG A/AA axe gate, and match its viewport screenshot. The test itself asserts that all four presets, desktop/tablet/phone viewport classes, both directions, and both explicit modes remain represented, so narrowing the matrix accidentally fails before a screenshot is taken.

The full palette is a separate gate. `contrast.spec.ts` renders all seven themes in dark and light mode, then repeats the resulting surfaces and controls for all twelve accents. It validates text, focus-ring, and adjacent-surface contrast without producing 168 screenshots. This division keeps screenshots reviewable while still exercising every supported theme, mode, and accent combination in a browser.
