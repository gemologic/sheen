import { Link } from "./Link.tsx";
import type { LinkProps } from "./Link.tsx";
import metadata from "./Link.meta.ts";

export const controls = metadata.props;
export default function LinkDemo(props: LinkProps) {
  return <Link {...props}>{props.children ?? "Orders"}</Link>;
}
