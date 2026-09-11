import { Tree, TreeItem } from "./Tree.tsx";
import type { TreeProps } from "./Tree.tsx";
import metadata from "./Tree.meta.ts";

export const controls = metadata.props;
export default function TreeDemo(props: TreeProps) {
  return <Tree {...props}><TreeItem value="source" label="Source"><TreeItem value="entry" label="index.ts" /></TreeItem><TreeItem value="readme" label="README" /></Tree>;
}
