import { TableRow, Table, TableBody, TableCell } from "./Table.tsx";
import type { TableRowProps } from "./Table.tsx";
import metadata from "./TableRow.meta.ts";

export const controls = metadata.props;
export default function TableRowDemo(props: TableRowProps) { return <Table><TableBody><TableRow {...props}>{props.children ?? <TableCell>Example</TableCell>}</TableRow></TableBody></Table>; }
