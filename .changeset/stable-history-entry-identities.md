---
"@gemologic/sheen-patterns": patch
---

Preserve native history-entry identity through bounded browser history, replacements, copied application state and adapter remounts. Share and clean up history-write ownership, incorporating monotonic router depth and entry identity into the existing native writes instead of adding calls that can exceed WebKit's history quota. Publish settled route coordinates and entry keys atomically so pane restoration never observes mixed identities. Capture final settled pane offsets on location cleanup, including when native traversal omits the router's own before-navigation notification.
