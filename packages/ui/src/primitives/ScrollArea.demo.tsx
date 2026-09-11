import { ScrollArea } from "./ScrollArea.tsx";
import type { ScrollAreaProps } from "./ScrollArea.tsx";
import metadata from "./ScrollArea.meta.ts";
export const controls = metadata.props;
export default function ScrollAreaDemo(props: ScrollAreaProps) { return <ScrollArea {...props} />; }
