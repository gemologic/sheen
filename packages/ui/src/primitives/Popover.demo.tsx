import { Popover } from "./Popover.tsx";
import type { PopoverProps } from "./Popover.tsx";
import metadata from "./Popover.meta.ts";
export const controls = metadata.props;
export default function PopoverDemo(props: PopoverProps = { title: "View options", trigger: "View options", children: "Adjust the current view." }) { return <Popover {...props} />; }
