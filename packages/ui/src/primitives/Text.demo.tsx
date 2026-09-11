import { Text } from "./Typography.tsx";
import type { TextProps } from "./Typography.tsx";
import metadata from "./Text.meta.ts";

export const controls = metadata.props;
export default function TextDemo(props: TextProps) { return <Text {...props}>{props.children ?? "Text preview"}</Text>; }
