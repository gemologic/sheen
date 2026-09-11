# Navigation lists

`NavList` provides a named navigation landmark and native unordered list. Use `NavItem` children with a visible `label` and a real `href`. Every link stays in ordinary Tab order. Enter, modified clicks, context menus, and `target`/`rel` retain browser behavior. These are neither menu items nor tabs, so they do not intercept arrow keys.

The app or its router supplies `current` for the destination representing the current page. Keep at most one current page per list. Sheen renders `aria-current="page"`, a logical start-side border, and stronger text. It does not infer route matches or block navigation. Actions belong in Button; unavailable destinations should be omitted or explained rather than represented as fake disabled links.

Use stable Solid child identities during refresh. Labels and current state update without replacing anchors. The `/nav-list` fixture proves native hash navigation, opening a real new tab, pre-hydration activation replay, and retained server links/drafts. The root label distinguishes multiple navigation landmarks, including scoped RTL navigation.

NavList and Breadcrumb share link-focus recovery. Reordered surviving links keep their node identity and recover focus if a DOM move blurs them. Removing the focused link transfers focus to the eligible link at its former position, searching forward and then backward. If no links survive, the named navigation root receives programmatic focus with a visible ring. This never activates a URL, and deliberate outside focus wins. Root observers and focus listeners are disposed with their owners; navigation roots are not additional Tab stops by default.

NavItem currently owns its native anchor styling, like Breadcrumb. Consolidating shared anchor behavior with the unfinished public Link component remains foundation work. Full component-state contrast and cross-browser qualification are not yet complete. Sidebar nesting/collapse and router integration belong to their separate shell tasks.
