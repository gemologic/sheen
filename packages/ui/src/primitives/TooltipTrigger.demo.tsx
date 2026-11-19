import { Button } from "./Button.tsx";
import { TooltipTrigger } from "./TooltipTrigger.tsx";
import type { TooltipTriggerProps } from "./TooltipTrigger.tsx";
import metadata from "./TooltipTrigger.meta.ts";

export const controls = metadata.props;
export default function TooltipTriggerDemo(props: TooltipTriggerProps = { content: "Archive the selected rows", children: trigger => <Button {...trigger} variant="outline">Archive</Button> }) { return <TooltipTrigger {...props} />; }
