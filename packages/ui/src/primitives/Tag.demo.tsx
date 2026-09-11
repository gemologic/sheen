import { Tag } from "./Status.tsx";
import type { TagProps } from "./Status.tsx";
import metadata from "./Tag.meta.ts";

export const controls = metadata.props;
export default function TagDemo(props: TagProps = { label: "In review" }) { return <Tag {...props} />; }
