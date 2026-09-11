import { defineMeta } from "../metadata.ts";
import type { ToastProps } from "./Toast.tsx";
export default defineMeta<ToastProps>({
  name: "Toast", package: "@gemologic/sheen", category: "overlays", summary: "A notification card with stable action, pending, retry, and dismissal controls.",
  props: {
    notification: { description: "Immutable controller snapshot. Raw errors are never rendered." },
    onAction: { description: "Request the owning controller's action. Pending actions cannot be invoked through the button." },
    onDismiss: { description: "Request removal without canceling app-owned work." },
    class: { description: "Additional card classes." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring", "--sheen-color-danger-fg", "--sheen-elevation-overlay"],
  a11y: { role: "group", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Notification card", setup: 'const notices = createToaster(); const id = notices.show({ title: "Saved", duration: null }); const notification = notices.notifications()[0];', code: '<>{notification && <Toast notification={notification} onAction={() => { void notices.runAction(id); }} onDismiss={() => { notices.dismiss(id); }} />}</>' }],
  guidance: { do: ["Key cards by notification handle and pass updated snapshots into the existing card.", "Provide safe localized action error text."], dont: ["Do not use a transient card as the only place essential information or actions can be found.", "Do not mistake the card for a complete queue presenter: announcements, timers, and removal belong to the presenter."] },
});
