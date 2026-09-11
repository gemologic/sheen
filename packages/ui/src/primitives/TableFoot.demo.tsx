import { TableFoot, Table, TableRow, TableCell } from "./Table.tsx";
import type { TableFootProps } from "./Table.tsx";
import metadata from "./TableFoot.meta.ts";

export const controls = metadata.props;
export default function TableFootDemo(props: TableFootProps) { return <Table><TableFoot {...props}>{props.children ?? <TableRow><TableCell>Example</TableCell></TableRow>}</TableFoot></Table>; }
