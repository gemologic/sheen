# Account, workspace, and notification controls

`AccountMenu`, `WorkspaceSwitcher`, and `NotificationCenter` render application identity and activity models from `@gemologic/sheen-patterns/admin`. They own presentation, overlay semantics, keyboard behavior, and stable item rendering. They do not fetch, persist, authorize, or mutate application data.

Applications pass current models and callbacks. Callbacks may start transport work, update application state after acceptance, report failures through a toast, or do nothing. Keep account, workspace, and notification IDs stable across refreshes so open overlays, native links, buttons, and focus survive record replacement.

The Loupe `/gallery/admin-controls` route demonstrates topbar, sidebar-header, and scoped RTL sidebar-footer placements against real GET and POST endpoints. Its state and adapters deliberately live in the fixture, outside the package.

Unread notifications include both a visual treatment and localized visible text. A notification with `kind: "link"` remains a native destination; a notification with `kind: "action"` remains a button. Marking one item or all items as read is app-owned and only updates the supplied model after the adapter accepts the operation.

Account and workspace menus use contextual portal targets, so a nested `ThemeScope` carries theme, mode, accent, density, direction, and focus-ring surface tokens into the overlay. The `target` prop controls topbar versus sidebar alignment, including the sidebar-footer dropup, but does not change the control's data ownership.
