import { Callout } from "./Notice.tsx";
import type { CalloutProps } from "./Notice.tsx";
import metadata from "./Callout.meta.ts";

export const controls = metadata.props;
export default function CalloutDemo(props: CalloutProps) { return <Callout {...props}>{props.children ?? "Surface content"}</Callout>; }
