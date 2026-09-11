import { ConfirmDialog } from "./ConfirmDialog.tsx";
import type { ConfirmDialogProps } from "./ConfirmDialog.tsx";
import metadata from "./ConfirmDialog.meta.ts";
export const controls = metadata.props;
export default function ConfirmDialogDemo(props: ConfirmDialogProps = { title: "Remove workspace?", description: "Saved views will be removed.", open: false, onConfirm: () => {}, onCancel: () => {} }) { return <ConfirmDialog {...props} />; }
