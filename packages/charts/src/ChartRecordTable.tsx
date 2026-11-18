import { For, Index, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import { Pagination, Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow, useTheme } from "@gemologic/sheen";
import { resolveChartMessages } from "./messages.ts";

const defaultPageSize = 50;
const maximumPageSize = 200;

export interface ChartRecordColumn {
  readonly label: string;
}

/** Bounded native-table disclosure shared by the record-shaped SVG charts. `undefined` cells render as localized missing values. */
export function ChartRecordTable(props: {
  readonly component: string;
  readonly label: string;
  readonly summary: string;
  readonly headerLabel: string;
  readonly columns: readonly ChartRecordColumn[];
  readonly rowCount: number;
  readonly header: (row: number) => string;
  readonly cell: (row: number, column: number) => string | undefined;
  readonly pageSize?: number;
  readonly viewLabel?: string;
  readonly loading?: boolean;
}): JSX.Element {
  const theme = useTheme();
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const pageSize = createMemo(() => {
    const value = props.pageSize ?? defaultPageSize;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximumPageSize) throw new Error(`${props.component} table pageSize must be an integer from 1 to ${maximumPageSize}`);
    return value;
  });
  const [requestedPage, setRequestedPage] = createSignal(0);
  const pageCount = createMemo(() => Math.ceil(props.rowCount / pageSize()));
  const page = createMemo(() => Math.min(requestedPage(), Math.max(0, pageCount() - 1)));
  createEffect(() => { if (page() !== requestedPage()) setRequestedPage(page()); });
  const indices = createMemo(() => {
    const start = page() * pageSize();
    return Array.from({ length: Math.min(pageSize(), Math.max(0, props.rowCount - start)) }, (_, offset) => start + offset);
  });
  return <details class="sheen-chart-data" aria-busy={props.loading || undefined}>
    <summary>{props.viewLabel ?? messages().viewAsTable}</summary>
    <p class="sheen-chart-data-summary">{props.summary}</p>
    <div class="sheen-chart-data-scroll" tabIndex={0} aria-label={props.label}>
      <Table striped>
        <TableCaption>{props.label}</TableCaption>
        <TableHead><TableRow><TableHeaderCell>{props.headerLabel}</TableHeaderCell><For each={props.columns}>{column => <TableHeaderCell numeric>{column.label}</TableHeaderCell>}</For></TableRow></TableHead>
        <TableBody><Show when={indices().length > 0} fallback={<TableRow><TableCell colSpan={props.columns.length + 1}>{theme.messages().empty}</TableCell></TableRow>}>
          <For each={indices()}>{row => <TableRow data-chart-row={row}><TableHeaderCell scope="row">{props.header(row)}</TableHeaderCell>
            <Index each={props.columns}>{(_column, column) => {
              const value = () => props.cell(row, column);
              return <TableCell numeric><Show when={value()} fallback={<><span aria-hidden="true">—</span><span class="sheen-chart-visually-hidden">{messages().missingValue}</span></>}>{value()}</Show></TableCell>;
            }}</Index>
          </TableRow>}</For>
        </Show></TableBody>
      </Table>
    </div>
    <Show when={pageCount() > 1}><Pagination class="sheen-chart-data-pagination" label={messages().tablePagination}
      pageIndex={page()} pageCount={pageCount()} pending={props.loading ?? false} onPageChange={setRequestedPage} /></Show>
  </details>;
}
