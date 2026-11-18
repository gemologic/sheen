---
"@gemologic/sheen-tokens": minor
"@gemologic/sheen": minor
---

Theme schema 5 adds motion roles: `duration-press`, `duration-spin`, `ease-spring`, `motion-distance-sm`, `motion-distance-lg`, and `motion-stagger`. Older private themes migrate automatically, and reduced motion zeroes them. UI transient layers now use the motion tokens instead of literal easings: popovers, menus, and select lists scale in from their anchor, toasts rise in, buttons give press feedback, and drawers slide again instead of being overridden by the dialog fade.
