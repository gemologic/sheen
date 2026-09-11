import { Tooltip } from "./Tooltip.tsx";
import type { TooltipProps } from "./Tooltip.tsx";
import metadata from "./Tooltip.meta.ts";
export const controls = metadata.props;
export default function TooltipDemo(props: TooltipProps = { content: "Save the workspace", shortcut: "mod+s", children: "Save" }) { return <Tooltip {...props} />; }
