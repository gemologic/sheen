import type { JSX } from "solid-js";
import { AlertDialog } from "./AlertDialog.tsx";
import type { AlertDialogProps } from "./AlertDialog.tsx";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";

export interface ConfirmDialogProps extends Omit<AlertDialogProps, "children" | "footer" | "trigger" | "initialFocus" | "closeLabel" | "dismissible" | "defaultOpen" | "onOpenChange"> {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "accent" | "danger";
}

export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const theme = useTheme();
  return <AlertDialog title={props.title} description={props.description} open={props.open}
    {...(props.contentId === undefined ? {} : { contentId: props.contentId })}
    {...(props.class === undefined ? {} : { class: props.class })}
    {...(props.returnFocus === undefined ? {} : { returnFocus: props.returnFocus })}
    {...(props.shortcutScope === undefined ? {} : { shortcutScope: props.shortcutScope })}
    closeLabel={props.cancelLabel ?? theme.messages().cancel} onOpenChange={next => { if (!next) props.onCancel(); }}
    footer={<Button variant="solid" tone={props.tone ?? "accent"} onClick={props.onConfirm}>{props.confirmLabel ?? theme.messages().confirm}</Button>} />;
}
