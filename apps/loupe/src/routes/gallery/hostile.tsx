import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Card, DropdownMenu, Grid, Heading, Stack, Text } from "@gemologic/sheen";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { useStreamingSeries } from "@gemologic/sheen-charts/streaming";
import { DataTable, defineColumns } from "@gemologic/sheen-table";
import { createHostileChartData, createHostileMenu, createHostileRows, hostileChartSample, hostileChartSeries, hostileChartStart, hostileLongText, hostileMultilingualText, hostileZeroWidthText } from "../../hostile-fixture.ts";
import type { HostileRow } from "../../hostile-fixture.ts";

const rows = createHostileRows();
const columns = defineColumns<HostileRow>([
  { id: "account", header: "Account", accessor: row => row.account, filter: { type: "text" }, sort: "text", width: "fill" },
  { id: "locale", header: "Locale sample", accessor: row => row.locale, filter: { type: "text" }, sort: "text", width: 180 },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Paused", "Review"], faceted: true }, sort: "text", width: 130 },
  { id: "amount", header: "Amount", accessor: row => row.amount, filter: { type: "number" }, sort: "number", numeric: true, width: 140 },
]);

export default function HostileGallery() {
  const [selectedAction, setSelectedAction] = createSignal("None");
  const menu = createMemo(() => createHostileMenu(setSelectedAction));
  const initialChartSamples = 64;
  const stream = useStreamingSeries({ capacity: 240, interval: 16, series: hostileChartSeries, initial: createHostileChartData(initialChartSamples) });
  let nextChartSample = initialChartSamples;
  let producer: number | undefined;
  onMount(() => {
    producer = window.setInterval(() => {
      stream.append(hostileChartStart + nextChartSample * 1_000, hostileChartSample(nextChartSample));
      nextChartSample += 1;
    }, 16);
  });
  onCleanup(() => { if (producer !== undefined) window.clearInterval(producer); });
  return <main class="loupe-hostile-page">
    <header><Heading level={1}>Hostile-content qualification</Heading><Text tone="muted">Deterministic pressure for text, directionality, nested overlays, and a full bounded client dataset.</Text></header>
    <Grid columns={2} gap="lg" class="loupe-hostile-grid">
      <Card><Stack><Heading level={2} size="h3">Text pressure</Heading>
        <Text class="loupe-hostile-long" data-hostile-long>{hostileLongText}</Text>
        <Text data-hostile-zero-width>{hostileZeroWidthText}</Text>
        <Text dir="rtl" lang="ar" data-hostile-rtl>{hostileMultilingualText}</Text>
      </Stack></Card>
      <Card><Stack><Heading level={2} size="h3">Overlay pressure</Heading>
        <Text tone="muted">Seven submenu levels terminate in 193 actions, exactly 200 menu records.</Text>
        <DropdownMenu trigger="Open 200-item menu" items={menu()} />
        <output aria-label="Selected hostile action">{selectedAction()}</output>
      </Stack></Card>
    </Grid>
    <section class="loupe-hostile-table"><Heading level={2}>100,000-row continuous table</Heading>
      <DataTable data={rows} columns={columns} getRowId={row => row.id} caption="Hostile accounts" pagination={false} initialViewportHeight={480} mobileLayout={{ pageSize: 20, titleColumn: "account" }} />
    </section>
    <Card class="loupe-hostile-streaming" data-hostile-streaming="ready"><Stack><Heading level={2} size="h3">Twelve-series streaming pressure</Heading>
      <Text tone="muted">The first eight signals use the categorical palette. Signals nine through twelve reuse colors with explicit dashed, dotted, and dash-dot encodings.</Text>
      <div class="loupe-hostile-streaming-status" role="status" aria-live="polite"><span>Buffered: {stream.size()}</span><span>Dropped: {stream.dropped()}</span><span>Rejected: {stream.rejected()}</span></div>
      <TimeSeries label="Hostile streaming signals" summary="Twelve continuously updated signals remain distinguishable when the eight-color palette repeats through non-color line encodings." xLabel="Time"
        series={hostileChartSeries} data={stream.data()} x={{ type: "time", tz: "UTC" }} height={320} legend="stacked" table={{ pageSize: 16 }} />
    </Stack></Card>
  </main>;
}
