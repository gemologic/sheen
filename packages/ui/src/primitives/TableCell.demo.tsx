import { TableCell, Table, TableBody, TableRow } from "./Table.tsx";
import type { TableCellProps } from "./Table.tsx";
import metadata from "./TableCell.meta.ts";

export const controls = metadata.props;
export default function TableCellDemo(props: TableCellProps) { return <Table><TableBody><TableRow><TableCell {...props}>{props.children ?? "Example"}</TableCell></TableRow></TableBody></Table>; }
