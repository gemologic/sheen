import { TableHeaderCell, Table, TableBody, TableRow } from "./Table.tsx";
import type { TableHeaderCellProps } from "./Table.tsx";
import metadata from "./TableHeaderCell.meta.ts";

export const controls = metadata.props;
export default function TableHeaderCellDemo(props: TableHeaderCellProps) { return <Table><TableBody><TableRow><TableHeaderCell {...props}>{props.children ?? "Example"}</TableHeaderCell></TableRow></TableBody></Table>; }
