---
"@gemologic/sheen": patch
---

Keep locale and reading direction independent of color-only theme updates. Existing floating layers no longer rebuild their positioning subscriptions when theme, accent, or mode changes; actual locale and direction changes still update retained forms and overlays.
