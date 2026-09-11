import { TableCaption, Table } from "./Table.tsx";
import type { TableCaptionProps } from "./Table.tsx";
import metadata from "./TableCaption.meta.ts";

export const controls = metadata.props;
export default function TableCaptionDemo(props: TableCaptionProps) { return <Table><TableCaption {...props}>{props.children ?? "Example"}</TableCaption></Table>; }
