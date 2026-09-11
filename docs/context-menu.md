# ContextMenu

ContextMenu attaches a scoped action menu to a native `div`, `li`, or table-row trigger. It reuses DropdownMenu's validated action, checkbox, radio-group, separator, and submenu model, so visible and contextual action surfaces can share one source instead of drifting.

A nonempty enabled replacement opens from right-click, `Shift+F10`, or the platform Context Menu key. It mounts into the nearest ThemeProvider or ThemeScope portal target, participates in provider layer ordering, and restores focus to the retained trigger after Escape. Arrow keys, Home, End, typeahead, Enter, and Space follow the shared menu contract.

An empty `items` collection renders only the requested native element. A disabled replacement also leaves the platform context menu available and restores long-press callout behavior. Do not call `preventDefault()` in consumer code. `ContextMenu` suppresses the native event only when an enabled replacement can actually open.

ContextMenu is an additional access path, never the only access path. Pair row context actions with a visible overflow control or selection action bar. During stale/pending data windows disable the replacement instead of allowing actions to target a retained row under a requested query.

Server output contains the native trigger but no portaled menu. Before hydration the browser menu therefore remains available. Once the contextual portal is ready, the retained trigger receives one replacement handler; no provisional menu or duplicate trigger is created.

Proof: two SSR tests cover native element retention, empty replacement fallback, and full-tree validation. DataTable's real Chromium fixture covers pointer and keyboard opening, selection-before-open semantics, menu action execution, one-layer Escape/focus restoration, pending replacement suppression, delayed hydration without duplicate menus, native-event preservation, and a reviewed dark menu baseline.
