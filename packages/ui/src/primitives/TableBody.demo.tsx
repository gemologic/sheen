import { TableBody, Table, TableRow, TableCell } from "./Table.tsx";
import type { TableBodyProps } from "./Table.tsx";
import metadata from "./TableBody.meta.ts";

export const controls = metadata.props;
export default function TableBodyDemo(props: TableBodyProps) { return <Table><TableBody {...props}>{props.children ?? <TableRow><TableCell>Example</TableCell></TableRow>}</TableBody></Table>; }
