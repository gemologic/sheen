import { Badge, Link, NumberText, Text } from "@gemologic/sheen";
import type { ToastController, ToastId, ToastOptions } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartData } from "@gemologic/sheen-charts/core";
import { useStreamingSeries } from "@gemologic/sheen-charts/streaming";
import { Sparkline } from "@gemologic/sheen-charts/svg";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { StatusBar } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import type { DataTableAction } from "@gemologic/sheen-table";
import { batch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { bootstrap, initialHistory, selectedSymbol } from "../bootstrap.ts";
import { useDesk } from "../desk.tsx";
import { normalRates, stormRates, useMarketClock } from "../feed.ts";
import { HISTORY_HZ, findInstrument, instruments, isHalted, requireInstrument, orderBook, parsePriceHistory, quote, sparkline } from "../lib/market.ts";
import type { BookLevel, Instrument, PriceHistory } from "../lib/market.ts";
import { parseOrderResponse } from "../lib/orders.ts";
import type { OrderRequest, PlannedFill, Side } from "../lib/orders.ts";
import { OrderTicket } from "../order-ticket.tsx";

const priceSeries = defineSeries([
  { key: "last", label: "Last", color: "foreground" },
  { key: "bid", label: "Bid", color: "chart-2", encoding: "dashed", hidden: true },
  { key: "ask", label: "Ask", color: "chart-5", encoding: "dotted", hidden: true },
]);

type Direction = "up" | "down" | "flat";
const direction = (value: number): Direction => !Number.isFinite(value) || Math.abs(value) < 1e-9 ? "flat" : value > 0 ? "up" : "down";
const glyph: Record<Direction, string> = { up: "▲", down: "▼", flat: "■" };

/** Price direction always uses the market-* tokens; accent never encodes direction. */
function Change(props: { readonly value: number; readonly format: Intl.NumberFormatOptions }) {
  return <span class="md-change" data-direction={direction(props.value)}>
    <span aria-hidden="true">{glyph[direction(props.value)]}</span>
    {Number.isFinite(props.value) ? <NumberText value={props.value} format={{ ...props.format, signDisplay: "exceptZero" }} /> : "—"}
  </span>;
}

interface WatchRow {
  readonly id: string;
  readonly name: string;
  readonly venue: string;
  readonly last: number;
  readonly change: number;
  readonly halted: boolean;
  readonly history: Float64Array;
  /** Direction of the 60-second sparkline, so the sparkline only re-renders when its own data changes. */
  readonly trend: "market-up" | "market-down" | "market-flat";
}

interface OrderRow {
  readonly id: string;
  readonly symbol: string;
  readonly side: Side;
  readonly type: OrderRequest["type"];
  readonly quantity: number;
  readonly filled: number;
  readonly averagePrice: number;
  readonly limitPrice: number | null;
  readonly status: "Pending" | "Working" | "Partially filled" | "Filled" | "Rejected" | "Cancelled";
  readonly submittedAt: number;
  readonly reason: string | null;
}

interface BlotterRow extends OrderRow {
  readonly pnl: number;
}

function historyData(history: PriceHistory | null): ChartData {
  const column = (values: readonly (number | null)[]) => Float64Array.from(values, value => value ?? Number.NaN);
  return { t: Float64Array.from(history?.t ?? []), last: column(history?.last ?? []), bid: column(history?.bid ?? []), ask: column(history?.ask ?? []) };
}

/** Formats with the desk's selected timezone; changing it updates text in retained cells without new rows. */
function ZonedTime(props: { readonly at: number }) {
  const desk = useDesk();
  const format = createMemo(() => new Intl.DateTimeFormat("en-US", { timeStyle: "medium", timeZone: desk.timeZone() }));
  return <time datetime={new Date(props.at).toISOString()}>{format().format(props.at)}</time>;
}

/** DataTable accessor values must be finite or null; halts surface as null, never zero. */
const finite = (value: number): number | null => Number.isFinite(value) ? value : null;

const priceFormat = { minimumFractionDigits: 2, maximumFractionDigits: 3 } satisfies Intl.NumberFormatOptions;

export default function Desk() {
  const router = useSolidRouterAdapter();
  const desk = useDesk();
  const start = bootstrap().now;
  const symbol = createMemo(() => selectedSymbol(router.location().search));
  const instrument = createMemo(() => requireInstrument(symbol()));
  const rates = () => desk.storm() ? stormRates : normalRates;

  // ── Chart stream ────────────────────────────────────────────────────────────
  const initial = initialHistory();
  const stream = useStreamingSeries({ capacity: 3_600, interval: 0, series: priceSeries, initial: historyData(initial) });
  const [chartReady, setChartReady] = createSignal(initial !== null);
  let lastChart = initial?.t.at(-1) ?? start;
  const scratch = new Float64Array(3);
  const appendSample = (at: number): void => {
    if (!chartReady()) return;
    // Strictly increasing UTC epoch milliseconds even when two frames share a clock reading.
    const t = Math.max(lastChart + 1, at);
    // A pause longer than one history step (hydration, background tab) is unobserved time: record it as a gap.
    if (t - lastChart > 1_000 / HISTORY_HZ * 2) {
      scratch.fill(Number.NaN);
      if (stream.append(lastChart + 1, scratch).kind === "accepted") lastChart += 1;
    }
    const value = quote(instrument(), t);
    scratch[0] = value.last;
    scratch[1] = value.bid;
    scratch[2] = value.ask;
    if (stream.append(t, scratch).kind === "accepted") lastChart = t;
  };
  const clock = useMarketClock(start, rates, appendSample);

  let historyRequest: AbortController | undefined;
  let historyToken = 0;
  createEffect(on(symbol, async next => {
    historyRequest?.abort();
    const controller = new AbortController();
    historyRequest = controller;
    const token = ++historyToken;
    batch(() => { setChartReady(false); stream.clear(); });
    try {
      const response = await fetch(`/api/history?symbol=${encodeURIComponent(next)}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`History failed (${response.status})`);
      const history = parsePriceHistory(await response.json());
      if (token !== historyToken || history.symbol !== symbol()) return;
      stream.appendBatch(historyData(history));
      lastChart = history.t.at(-1) ?? Date.now();
      setChartReady(true);
    } catch {
      if (token === historyToken && !controller.signal.aborted) desk.toasts.show({ title: `Could not load ${next} history`, tone: "danger" });
    }
  }, { defer: true }));
  onCleanup(() => historyRequest?.abort());

  // ── Watchlist ───────────────────────────────────────────────────────────────
  const sparkCache = new Map<string, { readonly second: number; readonly values: Float64Array }>();
  const sparkFor = (item: Instrument, at: number): Float64Array => {
    const second = Math.floor(at / 1_000);
    const cached = sparkCache.get(item.symbol);
    if (cached?.second === second) return cached.values;
    const values = sparkline(item, at);
    sparkCache.set(item.symbol, { second, values });
    return values;
  };
  const watchRows = createMemo((): readonly WatchRow[] => {
    const at = clock.watch();
    return instruments.map(item => {
      const last = quote(item, at).last;
      const history = sparkFor(item, at);
      const first = history.find(Number.isFinite);
      const end = history.findLast(Number.isFinite);
      const trend = first === undefined || end === undefined || first === end ? "market-flat" : end > first ? "market-up" : "market-down";
      return { id: item.symbol, name: item.name, venue: item.venue, last, change: (last - item.open) / item.open, halted: isHalted(item, at), history, trend };
    });
  });
  const watchColumns = defineColumns<WatchRow>([
    { id: "symbol", header: "Symbol", accessor: row => row.id, width: 96, pin: "start", search: true, cellDependencies: [],
      cell: value => <Link href={`/?symbol=${String(value)}`} variant="quiet">{String(value)}</Link> },
    { id: "name", header: "Name", accessor: row => row.name, search: true, width: "fill", minWidth: 120 },
    { id: "last", header: "Last", accessor: row => finite(row.last), numeric: true, sort: "number", width: 96, cellDependencies: ["halted"], flash: true,
      cell: (value, row) => row.halted ? <Badge tone="warning" size="sm">Halted</Badge> : <NumberText value={Number(value)} format={priceFormat} /> },
    { id: "change", header: "Change", accessor: row => finite(row.change), numeric: true, sort: "number", width: 104, cellDependencies: [],
      cell: value => <Change value={value === null ? Number.NaN : Number(value)} format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }} /> },
    { id: "trend", header: "60 s", width: 132, cellDependencies: ["history", "id", "trend"],
      cell: (_value, row) => <Sparkline values={row.history} label={`${row.id} last 60 seconds`} color={row.trend} width={120} height={24} /> },
  ]);

  // ── Order book ──────────────────────────────────────────────────────────────
  const book = createMemo((): readonly BookLevel[] => orderBook(instrument(), clock.book()));
  const maxDepth = createMemo(() => Math.max(1, ...book().map(level => level.total)));
  const bookColumns = defineColumns<BookLevel>([
    { id: "side", header: "Side", accessor: row => row.side, width: 64 },
    { id: "price", header: "Price", accessor: row => finite(row.price), numeric: true, width: 88, sort: false, cellDependencies: [],
      cell: value => value !== null ? <NumberText value={Number(value)} format={priceFormat} /> : "—" },
    { id: "size", header: "Size", accessor: row => row.size, numeric: true, width: 72, sort: false, cellDependencies: [], flash: true,
      cell: value => <NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /> },
    { id: "total", header: "Depth", accessor: row => row.total, numeric: true, width: "fill", sort: false, cellDependencies: ["side"],
      cell: (value, row) => <span class="md-depth" data-side={row.side} style={{ "--md-depth": `${(Number(value) / maxDepth()) * 100}%` }}><NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /></span> },
  ]);

  // ── Orders and blotter ──────────────────────────────────────────────────────
  const [orders, setOrders] = createSignal<readonly OrderRow[]>([]);
  const timers = new Set<number>();
  onCleanup(() => { for (const timer of timers) window.clearTimeout(timer); });
  const updateOrder = (id: string, change: (order: OrderRow) => OrderRow): void => { setOrders(previous => previous.map(order => order.id === id ? change(order) : order)); };
  let clientSerial = 0;

  const fillToasts = new Map<string, ToastId>();
  function scheduleFill(id: string, fill: PlannedFill, toasts: ToastController): void {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      let filledOrder: OrderRow | undefined;
      updateOrder(id, order => {
        if (order.status === "Cancelled" || order.status === "Filled") return order;
        const filled = order.filled + fill.quantity;
        filledOrder = { ...order, filled, averagePrice: (order.averagePrice * order.filled + fill.price * fill.quantity) / filled, status: filled >= order.quantity ? "Filled" : "Partially filled" };
        return filledOrder;
      });
      if (!filledOrder) return;
      // One toast per order: later fills update it in place instead of stacking.
      const notice: ToastOptions = { title: `${filledOrder.side === "Buy" ? "Bought" : "Sold"} ${filledOrder.filled.toLocaleString("en-US")} ${filledOrder.symbol} @ ${filledOrder.averagePrice.toFixed(2)} avg`, description: `${filledOrder.id} · ${filledOrder.status}`, tone: "success" };
      const existing = fillToasts.get(id);
      if (existing === undefined || !toasts.update(existing, notice)) fillToasts.set(id, toasts.show(notice));
    }, fill.delayMs);
    timers.add(timer);
  }

  async function submit(request: Omit<OrderRequest, "clientId">): Promise<void> {
    const clientId = `client-${++clientSerial}`;
    const pending: OrderRow = { id: clientId, symbol: request.symbol, side: request.side, type: request.type, quantity: request.quantity, filled: 0, averagePrice: 0, limitPrice: request.limitPrice, status: "Pending", submittedAt: Date.now(), reason: null };
    setOrders(previous => [pending, ...previous]);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, clientId }) });
      if (!response.ok) throw new Error(`Order failed (${response.status})`);
      const result = parseOrderResponse(await response.json());
      if (result.kind === "rejected") {
        updateOrder(clientId, order => ({ ...order, status: "Rejected", reason: result.reason }));
        desk.toasts.show({ title: `Order rejected: ${request.symbol}`, description: result.reason, tone: "danger" });
        return;
      }
      updateOrder(clientId, order => ({ ...order, id: result.id, status: "Working", submittedAt: result.acceptedAt }));
      for (const fill of result.fills) scheduleFill(result.id, fill, desk.toasts);
      if (result.fills.length === 0) desk.toasts.show({ title: `${result.id} working`, description: `${request.side} ${request.quantity.toLocaleString("en-US")} ${request.symbol} limit ${request.limitPrice?.toFixed(2) ?? ""}`, tone: "neutral" });
    } catch (error) {
      updateOrder(clientId, order => ({ ...order, status: "Rejected", reason: error instanceof Error ? error.message : "Network error" }));
      desk.toasts.show({ title: "Order not sent", description: "The order desk did not acknowledge it. Check your connection and resubmit.", tone: "danger" });
    }
  }

  const blotter = createMemo((): readonly BlotterRow[] => {
    const at = clock.book();
    return orders().map(order => {
      const item = findInstrument(order.symbol);
      const mark = item ? quote(item, at).last : Number.NaN;
      return { ...order, pnl: order.filled === 0 ? 0 : (mark - order.averagePrice) * order.filled * (order.side === "Buy" ? 1 : -1) };
    });
  });
  const blotterColumns = defineColumns<BlotterRow>([
      { id: "id", header: "Order", accessor: row => row.id, width: 112, search: true },
      { id: "time", header: "Submitted", accessor: row => row.submittedAt, sort: "number", width: 112, cellDependencies: [], cell: value => <ZonedTime at={Number(value)} /> },
      { id: "symbol", header: "Symbol", accessor: row => row.symbol, width: 88, search: true },
      { id: "side", header: "Side", accessor: row => row.side, width: 72 },
      { id: "quantity", header: "Quantity", accessor: row => row.quantity, numeric: true, width: 96, cellDependencies: [], cell: value => <NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /> },
      { id: "filled", header: "Filled", accessor: row => row.filled, numeric: true, width: 88, cellDependencies: [], cell: value => <NumberText value={Number(value)} format={{ maximumFractionDigits: 0 }} /> },
      { id: "average", header: "Avg price", accessor: row => row.averagePrice, numeric: true, width: 104, cellDependencies: ["filled"], cell: (value, row) => row.filled === 0 ? "—" : <NumberText value={Number(value)} format={priceFormat} /> },
      { id: "status", header: "Status", accessor: row => row.status, width: 140, cellDependencies: ["reason"],
        cell: (value, row) => <span class="md-status-cell"><Badge tone={value === "Filled" ? "success" : value === "Rejected" ? "danger" : value === "Cancelled" ? "neutral" : "info"} size="sm">{String(value)}</Badge>{row.reason ? <Text size="caption" tone="muted">{row.reason}</Text> : null}</span> },
      { id: "pnl", header: "P&L (USD)", accessor: row => finite(row.pnl), numeric: true, sort: "number", width: "fill", minWidth: 120, cellDependencies: ["filled"],
        cell: (value, row) => row.filled === 0 || value === null ? "—" : <Change value={Number(value)} format={{ style: "currency", currency: "USD" }} /> },
  ]);
  const blotterActions: readonly DataTableAction<BlotterRow>[] = [{
    id: "cancel", label: "Cancel order",
    disabled: context => context.loadedRows.every(row => row.status !== "Working" && row.status !== "Partially filled"),
    onSelect: context => {
      for (const row of context.loadedRows) if (row.status === "Working" || row.status === "Partially filled") updateOrder(row.id, order => ({ ...order, status: "Cancelled" }));
      desk.toasts.show({ title: "Cancel requested", description: "Unfilled quantity was cancelled locally for this demo.", tone: "neutral" });
    },
  }];

  const currentQuote = createMemo(() => quote(instrument(), clock.book()));
  const timeZoneLabel = () => desk.timeZone() === "UTC" ? "UTC" : desk.timeZone().replaceAll("_", " ");

  return <div class="md-desk">
    <section class="md-panel md-watchlist" aria-labelledby="watchlist-heading">
      <header><h2 id="watchlist-heading">Watchlist</h2><Text tone="muted" size="caption">{instruments.length} instruments</Text></header>
      <DataTable data={watchRows()} columns={watchColumns} getRowId={row => row.id} caption="Watchlist" density="compact" pagination={false}
        search={{ placeholder: "Filter symbols" }} filterBar={false} columnControls={false} export={false} initialViewportHeight={640}
        onRowActivate={row => router.navigate(`/?symbol=${row.id}`, { scroll: false })} />
    </section>
    <section class="md-panel md-detail" aria-labelledby="instrument-heading">
      <header>
        <div><h2 id="instrument-heading">{instrument().symbol} · {instrument().name}</h2><Text tone="muted" size="caption">{instrument().venue} · times in {timeZoneLabel()}</Text></div>
        <div class="md-quote" data-testid="quote">
          {Number.isFinite(currentQuote().last) ? <>
            <span class="md-last"><NumberText value={currentQuote().last} format={priceFormat} flash tween /></span>
            <span>Bid <NumberText value={currentQuote().bid} format={priceFormat} /></span>
            <span>Ask <NumberText value={currentQuote().ask} format={priceFormat} /></span>
            <Change value={(currentQuote().last - instrument().open) / instrument().open} format={{ style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </> : <Badge tone="warning">Halted</Badge>}
          <OrderTicket instrument={instrument()} quote={currentQuote()} onSubmit={request => { void submit(request); }} />
        </div>
      </header>
      <div class="md-detail-body">
      <TimeSeries label={`${instrument().symbol} price`} summary="Last, bid, and ask prices. Gaps are trading halts; prices are never carried across them." xLabel={`Time (${timeZoneLabel()})`}
        series={priceSeries} data={stream.data()} x={{ type: "time", tz: desk.timeZone() }} y={{ format: priceFormat, zero: false }} height={280} loading={!chartReady()} tooltip area live
        table={{ pageSize: 20, viewLabel: "View price samples" }} />
      <div class="md-book">
        <h3>Order book</h3>
        <DataTable data={book()} columns={bookColumns} getRowId={row => row.id} caption={`${instrument().symbol} order book`} density="compact" pagination={false}
          search={false} filterBar={false} columnControls={false} export={false} initialViewportHeight={420} />
      </div>
      </div>
    </section>
    <section class="md-panel md-blotter" aria-labelledby="blotter-heading">
      <header><h2 id="blotter-heading">Blotter</h2><Text tone="muted" size="caption">P&amp;L marks to the live last price</Text></header>
      <DataTable data={blotter()} columns={blotterColumns} getRowId={row => row.id} caption="Order blotter" density="compact" pagination={false}
        search={{ placeholder: "Filter orders" }} filterBar={false} export={false} initialViewportHeight={220} actions={blotterActions} selection={{ mode: "multiple", onChange: () => undefined }} />
    </section>
    <StatusBar class="md-status" connection="connected" counts={[{ label: "Chart samples", value: stream.size() }, { label: "Publications / s", value: clock.publications() }, { label: "Dropped", value: stream.dropped() }, { label: "Rejected", value: stream.rejected() }]}>
      <span data-testid="feed-mode">{desk.storm() ? "Tick storm: 60 Hz chart, 20 Hz tables" : "Normal: 30 Hz chart, 10 Hz tables"}</span>
    </StatusBar>
  </div>;
}
