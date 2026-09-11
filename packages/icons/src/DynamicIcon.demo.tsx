import { DynamicIcon } from "./runtime.tsx";
import type { DynamicIconProps } from "./runtime.tsx";
import metadata from "./DynamicIcon.meta.ts";

export const controls = metadata.props;
export default function DynamicIconDemo(props: DynamicIconProps) { return <DynamicIcon {...props} />; }
