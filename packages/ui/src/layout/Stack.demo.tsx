import { Stack } from "./Layout.tsx";
import type { StackProps } from "./Layout.tsx";
import metadata from "./Stack.meta.ts";

export const controls = metadata.props;
export default function StackDemo(props: StackProps) { return <Stack {...props}>{props.children ?? <><span>First item</span><span>Second item</span></>}</Stack>; }
