import { Row as Cluster } from "./Layout.tsx";
import type { RowProps } from "./Layout.tsx";
import metadata from "./Cluster.meta.ts";

export const controls = metadata.props;
export default function ClusterDemo(props: RowProps) { return <Cluster {...props}>{props.children ?? <><span>First item</span><span>Second item</span></>}</Cluster>; }
