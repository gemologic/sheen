import { defineMeta } from "../metadata.ts";
import type { AlertDialogProps } from "./AlertDialog.tsx";
import dialog from "./Dialog.meta.ts";

export default defineMeta<AlertDialogProps>({
  ...dialog, name: "AlertDialog", summary: "An interrupting modal with required explanation and explicit dismissal.",
  props: { ...dialog.props, description: { description: "Required explanatory text associated with the alert dialog." } },
  a11y: { role: "alertdialog", keyboard: ["Tab", "Shift+Tab", "Escape"] },
  examples: [{ title: "Review a destructive operation", code: '<AlertDialog title="Remove workspace?" description="This removes the workspace and its saved views." trigger="Review removal" closeLabel="Keep workspace" />' }],
  guidance: { do: ["Keep initial focus on the safe action for destructive decisions."], dont: ["Do not use alert dialogs for routine nonblocking status messages."] },
});
