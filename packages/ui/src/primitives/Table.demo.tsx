import { Table, TableCaption, TableBody, TableRow, TableCell } from "./Table.tsx";
import type { TableProps } from "./Table.tsx";
import metadata from "./Table.meta.ts";

export const controls = metadata.props;
export default function TableDemo(props: TableProps) { return <Table {...props}>{props.children ?? <><TableCaption>Example</TableCaption><TableBody><TableRow><TableCell>Value</TableCell></TableRow></TableBody></>}</Table>; }
