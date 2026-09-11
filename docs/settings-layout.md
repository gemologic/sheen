# SettingsLayout

`SettingsLayout` renders a stable in-page section rail, all setting sections, and one persistent save bar. It must be mounted inside `AppShell`; the pattern registers its app-provided `dirty` value with the shell's navigation and `beforeunload` guard.

Each section has a unique HTML-safe ID, a visible label, an optional description, and app-owned content. Navigation buttons use `aria-controls`, move to the corresponding section without changing routes, and can be controlled with `activeSection` and `onSectionChange`. The same section and control markup is emitted for desktop and phone. CSS turns the desktop rail into a horizontally scrollable phone strip without branching during hydration.

Draft and accepted values stay in the application. `onSave` returns the real operation promise. While it is pending, the save and discard actions reject duplicates but section fields remain editable. The app should capture the submitted draft and mark only that version accepted so a change made during the request remains dirty. A rejection leaves every section and draft mounted and exposes a localized failure. `saveError` can replace the generic failure with application detail. `onDiscard` restores the last accepted app state.

The save bar always remains in the DOM, including while clean. This avoids layout movement and prevents a focused save control from disappearing after success. The status output reports dirty, saving, and failed states without replacing content.

The Loupe `/settings-layout` fixture uses a real delayed success/rejection endpoint. Browser coverage samples every frame of a save, edits during the in-flight operation, checks dirty navigation blocking, verifies retry and discard ownership, switches to the phone layout, and delays JavaScript while adopting a pre-hydration input draft in dark server markup.
