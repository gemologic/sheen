---
"@gemologic/sheen": minor
---

Add CSS islands that mirror the JavaScript islands: `@gemologic/sheen/styles/core.css`, `@gemologic/sheen/styles/forms.css`, `@gemologic/sheen/styles/overlays.css`, and `@gemologic/sheen/styles/navigation.css`. Core holds the shared base (layer order, theme root, shared control and focus rules) and is required; the other islands contain only their own component rules and layer on top of it; `ShortcutSheet` also needs `styles/overlays.css` because it renders a Dialog. `@gemologic/sheen/styles.css` keeps working unchanged and now composes the four islands without duplicating rules.
