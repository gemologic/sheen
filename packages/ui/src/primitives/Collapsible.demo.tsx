import { Collapsible } from "./Collapsible.tsx";
import type { CollapsibleProps } from "./Collapsible.tsx";
import metadata from "./Collapsible.meta.ts";
export const controls = metadata.props;
export default function CollapsibleDemo(props: CollapsibleProps) { return <Collapsible {...props} />; }
