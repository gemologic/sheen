import { Badge } from "./Status.tsx";
import type { BadgeProps } from "./Status.tsx";
import metadata from "./Badge.meta.ts";

export const controls = metadata.props;
export default function BadgeDemo(props: BadgeProps) { return <Badge {...props}>{props.children ?? "Healthy"}</Badge>; }
