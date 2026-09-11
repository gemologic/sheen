import { For, Match, Switch as MatchSwitch, createSignal, onCleanup } from "solid-js";
import { Badge, Button, Card, EmptyState, Grid, Heading, Input, Select, Skeleton, Stack, Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow, Text } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { Sparkline, StatGroup } from "@gemologic/sheen-charts";
import { ErrorState } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";

type DashboardState = "ready" | "empty" | "loading" | "error" | "permission";

const states: readonly SelectOption[] = [
  { value: "ready", label: "Ready" },
  { value: "empty", label: "Empty" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Server error" },
  { value: "permission", label: "Permission denied" },
];
const activity: readonly { readonly id: string; readonly event: string; readonly owner: string; readonly status: "Healthy" | "Review" }[] = [
  { id: "evt-1", event: "Deployment completed", owner: "Ari", status: "Healthy" },
  { id: "evt-2", event: "Invoice imported", owner: "Mina", status: "Review" },
  { id: "evt-3", event: "Policy synchronized", owner: "Jo", status: "Healthy" },
  { id: "evt-4", event: "Backup verified", owner: "Sam", status: "Healthy" },
];
const throughput = new Float64Array([34, 38, 37, 43, 47, 51, 49, 56, 61, 58, 66, 72]);
const latency = new Float64Array([82, 79, 76, 91, 73, 70, 68, 65, 72, 63, 61, 58]);
const quality = new Float64Array([96, 97, 96, 98, 98, 99, 98, 99, 99, 98, 99, 99]);

function readState(search: string): DashboardState {
  const value = new URLSearchParams(search).get("state");
  return value === "empty" || value === "loading" || value === "error" || value === "permission" ? value : "ready";
}

export default function DashboardGallery() {
  const router = useSolidRouterAdapter();
  const [state, setState] = createSignal<DashboardState>(readState(router.location().search));
  const [refreshing, setRefreshing] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (next: DashboardState): void => {
    if (refreshTimer !== undefined) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    setRefreshing(false);
    setState(next);
    const search = next === "ready" ? "" : `?state=${next}`;
    router.navigate(`/gallery/dashboard${search}`, { replace: true });
  };
  const refresh = (): void => {
    if (refreshing()) return;
    setRefreshing(true);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      setRevision(value => value + 1);
      setRefreshing(false);
    }, 650);
  };
  onCleanup(() => { if (refreshTimer !== undefined) clearTimeout(refreshTimer); });

  return <main class="loupe-dashboard-page">
    <header class="loupe-dashboard-header">
      <div><Heading level={1}>Operations dashboard</Heading><Text tone="muted">Retained operational data with explicit empty, loading, failure, and authorization states.</Text></div>
      <div class="loupe-dashboard-controls" aria-label="Dashboard controls">
        <Select label="Dashboard state" value={state()} options={states} onValueChange={value => {
          if (value === "ready" || value === "empty" || value === "loading" || value === "error" || value === "permission") publish(value);
        }} />
        <Button onClick={refresh} disabled={state() !== "ready" || refreshing()}>Refresh data</Button>
        <output aria-label="Dashboard revision">Revision {revision()}</output>
      </div>
    </header>
    <MatchSwitch>
      <Match when={state() === "loading"}><section class="loupe-dashboard-loading" aria-label="Loading dashboard" aria-busy="true"><For each={[1, 2, 3, 4, 5, 6]}>{() => <Skeleton />}</For></section></Match>
      <Match when={state() === "empty"}><EmptyState heading="No dashboard data" description="The account is connected, but this workspace has no activity yet."><Button onClick={() => publish("ready")}>Load sample data</Button></EmptyState></Match>
      <Match when={state() === "error"}><ErrorState kind="server" description="The dashboard service did not return an accepted snapshot." onRetry={() => publish("ready")} /></Match>
      <Match when={state() === "permission"}><ErrorState kind="permission-denied" description="Dashboard data was removed immediately when access changed." onRetry={() => publish("ready")} /></Match>
      <Match when={state() === "ready"}>
        <section class="loupe-dashboard-content" data-dashboard-content data-pending={refreshing() || undefined} aria-busy={refreshing()}>
          <StatGroup label="Operational summary" stats={[
            { label: "Requests", value: "72.4k", trend: "up", trendLabel: "8.2% increase" },
            { label: "P99 latency", value: "58 ms", trend: "down", trendLabel: "12 ms lower" },
            { label: "Successful", value: "99.2%", trend: "flat", trendLabel: "Stable" },
          ]} />
          <Grid columns={3} gap="lg" class="loupe-dashboard-chart-grid">
            <Card><Stack><Heading level={2} size="h3">Throughput</Heading><Sparkline values={throughput} label="Throughput increased from 34 to 72" color="chart-1" /></Stack></Card>
            <Card><Stack><Heading level={2} size="h3">Latency</Heading><Sparkline values={latency} label="Latency decreased from 82 to 58 milliseconds" color="chart-2" /></Stack></Card>
            <Card><Stack><Heading level={2} size="h3">Quality</Heading><Sparkline values={quality} label="Quality remained between 96 and 99 percent" color="chart-3" /></Stack></Card>
          </Grid>
          <Grid columns={2} gap="lg" class="loupe-dashboard-detail-grid">
            <Card><Stack><Heading level={2} size="h3">Activity</Heading><Table striped><TableCaption>Recent workspace activity</TableCaption><TableHead><TableRow><TableHeaderCell>Event</TableHeaderCell><TableHeaderCell>Owner</TableHeaderCell><TableHeaderCell>Status</TableHeaderCell></TableRow></TableHead><TableBody><For each={activity}>{item => <TableRow><TableCell>{item.event}</TableCell><TableCell>{item.owner}</TableCell><TableCell><Badge tone={item.status === "Healthy" ? "success" : "warning"}>{item.status}</Badge></TableCell></TableRow>}</For></TableBody></Table></Stack></Card>
            <Card><Stack><Heading level={2} size="h3">Operator notes</Heading><Input label="Retained dashboard draft" placeholder="Add a note before refreshing" /><Text tone="muted">Accepted content remains mounted while revision {revision() + 1} is pending.</Text></Stack></Card>
          </Grid>
        </section>
      </Match>
    </MatchSwitch>
  </main>;
}
