import type { JSX } from "solid-js";
import { ModalFrame } from "./Dialog.tsx";
import type { DialogProps } from "./Dialog.tsx";

export interface AlertDialogProps extends DialogProps { description: string }

/** Requires an explicit dismissal and initially focuses the safe close action. */
export function AlertDialog(props: AlertDialogProps): JSX.Element { return <ModalFrame {...props} alert />; }
