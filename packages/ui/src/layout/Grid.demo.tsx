import { Grid } from "./Layout.tsx";
import type { GridProps } from "./Layout.tsx";
import metadata from "./Grid.meta.ts";

export const controls = metadata.props;
export default function GridDemo(props: GridProps) { return <Grid {...props}>{props.children ?? <><span>First item</span><span>Second item</span></>}</Grid>; }
