import { defineMeta } from "../metadata.ts";
import type { ToasterProps } from "./Toaster.tsx";
export default defineMeta<ToasterProps>({
  name: "Toaster", package: "@gemologic/sheen", category: "overlays", summary: "A scoped, bounded notification queue with live announcements and paused visible-time expiry.",
  props: {
    controller: { description: "Owner-local notification controller. Mount one presenter for each controller." },
    limit: { description: "Positive maximum number of visible or exiting cards; queued cards do not consume lifetime.", default: 3 },
    label: { description: "Accessible region name; defaults to the scoped notifications message." },
    class: { description: "Additional region classes." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-duration-fast", "--sheen-space-block-md"],
  a11y: { role: "region", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{ title: "Scoped notifications", setup: "const notices = createToaster();", code: '<><Button onClick={() => { notices.show({ title: "Saved", tone: "success" }); }}>Save</Button><Toaster controller={notices} /></>' }],
  guidance: { do: ["Create and mount a controller inside the appropriate theme scope.", "Keep essential information and actions available without a time limit."], dont: ["Do not treat dismissal as cancellation of an app-owned request.", "Do not mount multiple presenters for the same controller."] },
});
