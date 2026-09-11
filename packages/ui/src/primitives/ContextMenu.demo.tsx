import { ContextMenu } from "./ContextMenu.tsx";
import type { ContextMenuProps } from "./ContextMenu.tsx";
import metadata from "./ContextMenu.meta.ts";

export const controls = metadata.props;
export default function ContextMenuDemo(props: ContextMenuProps) {
  return <ContextMenu {...props} />;
}
