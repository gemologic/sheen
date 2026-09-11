import { Toast } from "./Toast.tsx";
import type { ToastProps } from "./Toast.tsx";
import metadata from "./Toast.meta.ts";
export const controls = metadata.props;
export default function ToastDemo(props: ToastProps) { return <Toast {...props} />; }
