# StatusBar

`StatusBar` is exported by `@gemologic/sheen-patterns`; load that package's stylesheet alongside sheen styles and place it in AppShell's `statusBar` slot.

The app supplies `connection`: connected, connecting, disconnected, degraded, or unknown. Omission renders no connection state. This component never subscribes to browser online/offline events, polls a backend, or owns task execution. A visible localized label accompanies each decorative connection dot.

`tasks` is a nonnegative safe-integer pending-task count; zero or omission hides that indicator. Connection and task text share a polite atomic status region. Frequent `counts` updates stay outside the live region in a description list, with unique nonempty app-localized labels and nonnegative safe-integer values. Numbers use the explicit scoped locale. Provider/scope message overrides supply the group name, connection labels, and background-task label.

Native attributes and action children are forwarded. The bar wraps at narrow widths, honors `hidden`, uses token-based compact typography, and preserves action controls across status and locale updates. It does not create another footer landmark when placed in the shell's existing footer.

Qualification covers real SSR, invalid counts, localized messages/formatting, native keyboard retry, app-driven updates while the browser is offline, retained drafts and DOM through delayed hydration, mobile overflow, and a visually reviewed dark/light RTL baseline. Full contrast/state matrices, assistive-technology announcement behavior, and cross-browser qualification remain open. PageHeader, Toolbar, and regional loading/error patterns remain separate TODO obligations.
