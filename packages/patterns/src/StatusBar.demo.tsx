import { StatusBar } from "./StatusBar.tsx";
import type { StatusBarProps } from "./StatusBar.tsx";
import metadata from "./StatusBar.meta.ts";
export const controls = metadata.props;
export default function StatusBarDemo(props: StatusBarProps) { return <StatusBar {...props} />; }
