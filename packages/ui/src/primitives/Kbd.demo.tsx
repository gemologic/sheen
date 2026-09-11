import { Kbd } from "./Typography.tsx";
import type { KbdProps } from "./Typography.tsx";
import metadata from "./Kbd.meta.ts";

export const controls = metadata.props;
export default function KbdDemo(props: KbdProps) { return <Kbd {...props}>{props.children ?? "Ctrl K"}</Kbd>; }
