import { IconButton } from "./IconButton.tsx";
import type { IconButtonProps } from "./IconButton.tsx";
import metadata from "./IconButton.meta.ts";

export const controls = metadata.props;
export default function IconButtonDemo(props: IconButtonProps) {
  return <IconButton {...props}>{props.children ?? <span>⋯</span>}</IconButton>;
}
