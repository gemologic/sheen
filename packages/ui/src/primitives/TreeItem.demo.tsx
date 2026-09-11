import { Tree, TreeItem } from "./Tree.tsx";
import type { TreeItemProps } from "./Tree.tsx";
import metadata from "./TreeItem.meta.ts";

export const controls = metadata.props;
export default function TreeItemDemo(props: TreeItemProps) { return <Tree label="Example tree"><TreeItem {...props} /></Tree>; }
