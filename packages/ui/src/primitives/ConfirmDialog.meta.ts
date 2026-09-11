import { defineMeta } from "../metadata.ts";
import type { ConfirmDialogProps } from "./ConfirmDialog.tsx";

export default defineMeta<ConfirmDialogProps>({
  name: "ConfirmDialog", package: "@gemologic/sheen", category: "overlays", summary: "A controlled confirmation decision with safe initial focus.",
  props: {
    title: { description: "Required visible and accessible title." },
    contentId: { description: "Optional unique content ID, forwarded to AlertDialog." },
    description: { description: "Required explanation of the decision and its consequences." },
    open: { description: "App-owned visibility." },
    returnFocus: { description: "Optional surviving focus target when the prompt closes." },
    shortcutScope: { description: "Unique modal shortcut scope ID, forwarded to AlertDialog. Open confirmations automatically suspend outer shortcut scopes within ShortcutProvider." },
    class: { description: "Additional modal content classes." },
    onConfirm: { description: "Affirmative decision callback. The app owns closing and subsequent operations." },
    onCancel: { description: "Cancellation callback for the safe action or Escape. Outside clicks do not cancel." },
    confirmLabel: { description: "Affirmative action label, defaulting to the scoped confirm message." },
    cancelLabel: { description: "Safe action label, defaulting to the scoped cancel message." },
    tone: { description: "Affirmative action tone.", default: "accent", control: { kind: "select", values: ["accent", "danger"] } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-focus-ring", "--sheen-elevation-modal"],
  a11y: { role: "alertdialog", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{ title: "Imperative confirmation", setup: 'const decision = createConfirm();', code: '<><Button onClick={() => { void decision.confirm({ title: "Remove workspace?", description: "Saved views will be removed.", tone: "danger" }); }}>Review removal</Button><decision.Dialog /></>' }],
  guidance: { do: ["Mount the controller Dialog once in the creating owner's theme scope."], dont: ["Do not start irreversible work before the confirmation promise resolves true."] },
});
