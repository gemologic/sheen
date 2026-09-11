import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface TableProps extends JSX.HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
}
export function Table(props: TableProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "striped"]);
  return <table {...others} class={cn("sheen-table", local.class)} data-striped={local.striped || undefined} />;
}

export type TableCaptionProps = JSX.HTMLAttributes<HTMLTableCaptionElement>;
export function TableCaption(props: TableCaptionProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <caption {...others} class={cn("sheen-table-caption", local.class)} />;
}

export type TableHeadProps = JSX.HTMLAttributes<HTMLTableSectionElement>;
export function TableHead(props: TableHeadProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <thead {...others} class={cn("sheen-table-thead", local.class)} />;
}

export type TableBodyProps = JSX.HTMLAttributes<HTMLTableSectionElement>;
export function TableBody(props: TableBodyProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <tbody {...others} class={cn("sheen-table-tbody", local.class)} />;
}

export type TableFootProps = JSX.HTMLAttributes<HTMLTableSectionElement>;
export function TableFoot(props: TableFootProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <tfoot {...others} class={cn("sheen-table-tfoot", local.class)} />;
}

export type TableRowProps = JSX.HTMLAttributes<HTMLTableRowElement>;
export function TableRow(props: TableRowProps): JSX.Element {
  const [local, others] = splitProps(props, ["class"]);
  return <tr {...others} class={cn("sheen-table-tr", local.class)} />;
}

export interface TableHeaderCellProps extends JSX.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}
export function TableHeaderCell(props: TableHeaderCellProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "numeric", "scope"]);
  return <th {...others} class={cn("sheen-table-th", local.class)} scope={local.scope ?? "col"} data-numeric={local.numeric || undefined} />;
}

export interface TableCellProps extends JSX.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}
export function TableCell(props: TableCellProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "numeric"]);
  return <td {...others} class={cn("sheen-table-td", local.class)} data-numeric={local.numeric || undefined} />;
}
