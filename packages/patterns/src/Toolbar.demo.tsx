import { Toolbar } from "./Toolbar.tsx";
import type { ToolbarProps } from "./Toolbar.tsx";
import metadata from "./Toolbar.meta.ts";
export const controls = metadata.props;
export default function ToolbarDemo(props: ToolbarProps) { return <Toolbar {...props} />; }
