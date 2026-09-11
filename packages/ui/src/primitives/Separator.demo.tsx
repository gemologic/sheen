import { Separator } from "./Separator.tsx";
import type { SeparatorProps } from "./Separator.tsx";
import metadata from "./Separator.meta.ts";

export const controls = metadata.props;
export default function SeparatorDemo(props: SeparatorProps) { return <Separator {...props} />; }
