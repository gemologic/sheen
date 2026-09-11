import { Dialog } from "./Dialog.tsx";
import type { DialogProps } from "./Dialog.tsx";
import metadata from "./Dialog.meta.ts";

export const controls = metadata.props;
export default function DialogDemo(props: DialogProps = { title: "Settings", trigger: "Open settings" }) { return <Dialog {...props}>{props.children ?? "Scoped dialog content"}</Dialog>; }
