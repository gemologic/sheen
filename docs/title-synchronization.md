# Title synchronization contract

`AppShell.documentTitle` registers the title of accepted route data through the app-owned Solid head manager. The injected router still supplies only location, navigation, and blocking. Sheen does not infer human-readable text from URL segments and never mutates `document.title` after mount as a side effect.

The implementation uses `@solidjs/meta` 0.29.4, the Solid 1.x-compatible line, rather than introducing another head owner. Patterns declares it as a peer and development dependency; applications using `documentTitle` mount one `MetaProvider` at the router root and may supply an application fallback `Title` there.

Ownership:

- Loupe mounts `MetaProvider` once in the router root and defines `Loupe · Sheen` as its fallback. Its server entry contains no competing literal title.
- `documentTitle` is distinct from the native HTML `title` attribute and the accessible content `label`.
- Apps derive the title from accepted route or loader data. A blocked destination has not become accepted state, so it cannot change the title.
- Disposing the shell removes its title registration and reveals the application fallback.

Acceptance evidence is in `packages/patterns/src/AppShell.test.tsx` and `tests/browser/title-sync.spec.ts`. It covers escaped SSR output with exactly one effective title, delayed hydration without a fallback-title frame, reactive accepted-state changes without shell remount, blocked navigation, back/forward updates, and disposal revealing the fallback. The broader router suite separately covers dirty navigation and two-axis pane restoration.

References: [Solid Meta setup](https://docs.solidjs.com/solid-meta/getting-started/installation-and-setup), [Title](https://docs.solidjs.com/solid-meta/reference/meta/title), and [Solid version compatibility](https://docs.solidjs.com/solid-meta/v1).
