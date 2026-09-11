import { AlertDialog } from "./AlertDialog.tsx";
import type { AlertDialogProps } from "./AlertDialog.tsx";
import metadata from "./AlertDialog.meta.ts";
export const controls = metadata.props;
export default function AlertDialogDemo(props: AlertDialogProps = { title: "Remove workspace?", description: "Saved views will be removed.", trigger: "Review removal", closeLabel: "Keep workspace" }) { return <AlertDialog {...props} />; }
