import { Center } from "./Layout.tsx";
import type { CenterProps } from "./Layout.tsx";
import metadata from "./Center.meta.ts";

export const controls = metadata.props;
export default function CenterDemo(props: CenterProps) { return <Center {...props}>{props.children ?? <span>Content</span>}</Center>; }
