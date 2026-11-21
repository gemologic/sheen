---
"@gemologic/sheen-cli": patch
---

The `sheen` bin now runs when invoked through a package manager. Its entry check compared the symlinked `node_modules/.bin` path with the real module path, so `sheen doctor`, `sheen sync-skill`, and every other command exited 0 without doing anything. Consumers whose CI runs `sheen doctor` should expect real diagnostics now. `sheen --help` prints usage.
