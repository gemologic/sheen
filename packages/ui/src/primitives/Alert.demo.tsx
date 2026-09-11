import { Alert } from "./Notice.tsx";
import type { AlertProps } from "./Notice.tsx";
import metadata from "./Alert.meta.ts";

export const controls = metadata.props;
export default function AlertDemo(props: AlertProps) { return <Alert {...props}>{props.children ?? "Surface content"}</Alert>; }
