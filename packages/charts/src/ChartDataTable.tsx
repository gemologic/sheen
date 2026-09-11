import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import {
  Pagination,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  cn,
  useTheme,
} from "@gemologic/sheen";
import { defineSeries, validateColumnar } from "./chart-types.ts";
import type { ChartDataTableProps } from "./chart-types.ts";
import { createChartTableFormatters } from "./format.ts";
import { resolveChartMessages } from "./messages.ts";

const defaultPageSize = 50;
const maximumPageSize = 200;

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`ChartDataTable ${name} must be nonempty`);
  return value;
}

export function ChartDataTable(props: ChartDataTableProps): JSX.Element {
  const theme = useTheme();
  const definitions = createMemo(() => defineSeries(props.series));
  const data = createMemo(() => validateColumnar(props.data, definitions()));
  const pageSize = createMemo(() => {
    const value = props.pageSize ?? defaultPageSize;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximumPageSize) throw new Error(`ChartDataTable pageSize must be an integer from 1 to ${maximumPageSize}`);
    return value;
  });
  const messages = createMemo(() => resolveChartMessages(theme.messages()));
  const formatters = createMemo(() => createChartTableFormatters(theme.state().locale, props.x, props.y));
  const [requestedPage, setRequestedPage] = createSignal(0);
  const pageCount = createMemo(() => Math.ceil(data().t.length / pageSize()));
  const page = createMemo(() => Math.min(requestedPage(), Math.max(0, pageCount() - 1)));
  createEffect(() => { if (requestedPage() !== page()) setRequestedPage(page()); });
  const indices = createMemo(() => {
    const start = page() * pageSize();
    return Array.from({ length: Math.min(pageSize(), Math.max(0, data().t.length - start)) }, (_, offset) => start + offset);
  });
  const columnCount = createMemo(() => definitions().length + 1);
  const label = createMemo(() => requiredText(props.label, "label"));
  const summary = createMemo(() => requiredText(props.summary, "summary"));
  const xLabel = createMemo(() => requiredText(props.xLabel, "xLabel"));
  const viewLabel = createMemo(() => props.viewLabel === undefined ? messages().viewAsTable : requiredText(props.viewLabel, "viewLabel"));

  return <details class={cn("sheen-chart-data", props.class)} aria-busy={props.loading || undefined}>
    <summary>{viewLabel()}</summary>
    <p class="sheen-chart-data-summary">{summary()}</p>
    <div class="sheen-chart-data-scroll" tabIndex={0} aria-label={label()}>
      <Table striped>
        <TableCaption>{label()}</TableCaption>
        <TableHead><TableRow>
          <TableHeaderCell>{xLabel()}</TableHeaderCell>
          <For each={definitions()}>{series => <TableHeaderCell numeric>{series.label}</TableHeaderCell>}</For>
        </TableRow></TableHead>
        <TableBody>
          <Show when={indices().length > 0} fallback={<TableRow><TableCell colSpan={columnCount()}>{theme.messages().empty}</TableCell></TableRow>}>
            <For each={indices()}>{index => <TableRow data-chart-row={index}>
              <TableHeaderCell scope="row">{formatters().x(data().t[index] ?? Number.NaN)}</TableHeaderCell>
              <For each={definitions()}>{series => {
                const value = () => data()[series.key]?.[index] ?? Number.NaN;
                return <TableCell numeric>{Number.isNaN(value())
                  ? <><span aria-hidden="true">—</span><span class="sheen-chart-visually-hidden">{messages().missingValue}</span></>
                  : formatters().value(value())}</TableCell>;
              }}</For>
            </TableRow>}</For>
          </Show>
        </TableBody>
      </Table>
    </div>
    <Show when={pageCount() > 1}><Pagination class="sheen-chart-data-pagination" label={messages().tablePagination}
      pageIndex={page()} pageCount={pageCount()} pending={props.loading ?? false} onPageChange={setRequestedPage} /></Show>
  </details>;
}
