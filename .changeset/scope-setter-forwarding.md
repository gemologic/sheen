---
"@gemologic/sheen": minor
"@gemologic/sheen-patterns": patch
---

A non-controllable `ThemeScope` now forwards setter calls for axes it does not pin to its parent, so `useTheme().setMode()` and friends work inside `AdminApp` (which scopes only density). Setting an axis the scope pins still rejects with an error naming that axis. `SettingsLayout`'s section index now has a visible heading and follows the reading position as the page scrolls; a navigation click keeps its section current until the scroll settles.
