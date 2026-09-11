import { TableHead, Table, TableRow, TableHeaderCell } from "./Table.tsx";
import type { TableHeadProps } from "./Table.tsx";
import metadata from "./TableHead.meta.ts";

export const controls = metadata.props;
export default function TableHeadDemo(props: TableHeadProps) { return <Table><TableHead {...props}>{props.children ?? <TableRow><TableHeaderCell>Example</TableHeaderCell></TableRow>}</TableHead></Table>; }
