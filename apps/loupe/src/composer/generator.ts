import type { ComposerFixtureCatalog } from "./fixtures.ts";
import type { ComposerComponentNode, ComposerDocument, ComposerRegionId, ComposerScalar } from "./model.ts";
import { composerPlacements, composerRegion, readComposerDocument } from "./model.ts";

export type ComposerGenerationMode = "self-contained" | "structure-only";

function quote(value: string): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function scalarCode(value: ComposerScalar): string {
  if (typeof value === "string") return quote(value);
  if (value === null) return "null";
  return String(value);
}

function propsCode(node: ComposerComponentNode, omitted: readonly string[] = []): string {
  return Object.keys(node.props).filter(name => name !== "children" && !omitted.includes(name)).sort().map(name => ` ${name}={${scalarCode(node.props[name] ?? null)}}`).join("");
}

function indent(value: string, depth: number): string {
  const prefix = "  ".repeat(depth);
  return value.split("\n").map(line => line ? `${prefix}${line}` : line).join("\n");
}

function nodesCode(nodes: readonly ComposerComponentNode[], depth: number, mode: ComposerGenerationMode): string {
  return nodes.map(node => nodeCode(node, depth, mode)).join("\n");
}

function nodeChildren(node: ComposerComponentNode, depth: number, mode: ComposerGenerationMode): string {
  return nodesCode(node.children, depth, mode);
}

function textChild(node: ComposerComponentNode, fallback: string): string {
  const value = node.props.children;
  return quote(typeof value === "string" ? value : fallback);
}

function containerCode(node: ComposerComponentNode, depth: number, mode: ComposerGenerationMode): string {
  const children = nodeChildren(node, depth + 1, mode);
  if (!children) return indent(`<${node.component}${propsCode(node)} />`, depth);
  return `${indent(`<${node.component}${propsCode(node)}>`, depth)}\n${children}\n${indent(`</${node.component}>`, depth)}`;
}

function nodeCode(node: ComposerComponentNode, depth: number, mode: ComposerGenerationMode): string {
  switch (node.component) {
    case "Stack":
    case "Grid":
    case "Card": return containerCode(node, depth, mode);
    case "Heading":
    case "Text":
    case "Button": {
      const action = node.component === "Button" && node.fixture === "primary-action" ? " onClick={() => setDetailsOpen(true)}" : "";
      return indent(`<${node.component}${propsCode(node)}${action}>{${textChild(node, node.component)}}</${node.component}>`, depth);
    }
    case "Input": return indent(`<Input${propsCode(node)} />`, depth);
    case "PageHeader": {
      const actions = mode === "structure-only" ? " actions={props.pageHeaderActions}" : " actions={<Button>Export records</Button>}";
      return indent(`<PageHeader${propsCode(node)}${actions} />`, depth);
    }
    case "QueryBuilder": return indent(`<QueryBuilder columns={queryColumns} value={queryFilter()} onChange={setQueryFilter}${propsCode(node)} />`, depth);
    case "DataTable": {
      const pagination = node.props.pagination === false ? "false" : "{ pageIndex: 0, pageSize: 12 }";
      const density = node.props.density === "comfortable" || node.props.density === "spacious" ? node.props.density : "compact";
      return indent(`<DataTable data={records} columns={columns} getRowId={row => row.id} caption={${quote(typeof node.props.caption === "string" ? node.props.caption : "Application records")}} variant="integrated" density=${quote(density)} pagination={${pagination}} filter={queryFilter()} onAcceptedStateChange={state => setQueryFilter(state.filter)} search={{}} filterBar columnControls export={{ filename: "application-records" }} initialViewportHeight={320} mobileLayout={{ pageSize: 12, titleColumn: "account" }} />`, depth);
    }
    case "ActivityTimeline": return indent(`<ActivityTimeline${propsCode(node, ["refreshing"])} items={activity} />`, depth);
    case "TimeSeries": return indent(`<TimeSeries${propsCode(node, ["legend"])} series={series} data={chartData} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} legend={${node.props.legend === false ? "false" : quote(typeof node.props.legend === "string" ? node.props.legend : "inline")}} />`, depth);
  }
}

function regionComponents(document: ComposerDocument, region: ComposerRegionId): readonly ComposerComponentNode[] {
  return composerRegion(document, region).nodes.filter(node => node.type === "component");
}

function finiteArray(values: Float64Array): string {
  return [...values].map(value => Number.isNaN(value) ? "Number.NaN" : String(Math.round(value * 1_000) / 1_000)).join(", ");
}

function recordFixture(fixtures: ComposerFixtureCatalog): string {
  return JSON.stringify(fixtures.records.slice(0, 24), null, 2).replaceAll("<", "\\u003c");
}

function activityFixture(fixtures: ComposerFixtureCatalog): string {
  return JSON.stringify(fixtures.activity, null, 2).replaceAll("<", "\\u003c");
}

function fixturePrelude(fixtures: ComposerFixtureCatalog, mode: ComposerGenerationMode): string {
  const shared = `export interface GeneratedRecord { readonly id: string; readonly account: string; readonly owner: string; readonly status: "Active" | "Review" | "Paused"; readonly amount: number; }

const columns = defineColumns<GeneratedRecord>([
  { id: "account", header: "Account", accessor: row => row.account, search: true, filter: { type: "text" }, sort: "text", width: "fill" },
  { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: 180 },
  { id: "status", header: "Status", accessor: row => row.status, filter: { type: "enum", options: ["Active", "Review", "Paused"], faceted: true }, sort: "text", width: 120 },
  { id: "amount", header: "Amount", accessor: row => row.amount, filter: { type: "number" }, sort: "number", numeric: true, width: 140 },
]);

const queryColumns = [
  { id: "account", label: "Account", type: "text" },
  { id: "owner", label: "Owner", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["Active", "Review", "Paused"] },
  { id: "amount", label: "Amount", type: "number" },
] satisfies readonly QueryBuilderColumn[];

const initialQuery: FilterNode = { kind: "and", children: [
  { kind: "enum", column: "status", operator: "in", values: ["Active", "Review", "Paused"] },
] };

const series = defineSeries([
  { key: "p50", label: "p50", color: "chart-1" },
  { key: "p99", label: "p99", color: "chart-3", encoding: "dashed" },
]);`;
  if (mode === "structure-only") return `${shared}

export interface GeneratedAdminProps {
  readonly records: readonly GeneratedRecord[];
  readonly activity: readonly ActivityTimelineItem[];
  readonly chartData: ChartData;
  readonly pageHeaderActions?: JSX.Element;
  readonly toolbarExtras?: JSX.Element;
  readonly mainExtras?: JSX.Element;
  readonly detailsExtras?: JSX.Element;
  readonly statusExtras?: JSX.Element;
}`;
  const p50 = fixtures.chart.data.p50;
  const p99 = fixtures.chart.data.p99;
  if (!p50 || !p99) throw new Error("Composer latency fixture is incomplete");
  return `${shared}

const records: readonly GeneratedRecord[] = ${recordFixture(fixtures)};
const activity: readonly ActivityTimelineItem[] = ${activityFixture(fixtures)};
const chartData: ChartData = {
  t: new Float64Array([${finiteArray(fixtures.chart.data.t)}]),
  p50: new Float64Array([${finiteArray(p50)}]),
  p99: new Float64Array([${finiteArray(p99)}]),
};`;
}

function imports(mode: ComposerGenerationMode): string {
  return `import { ActivityTimeline, Button, Card, Grid, Heading, Input, SearchInput, Stack, Text${mode === "self-contained" ? ", ThemeProvider" : ""} } from "@gemologic/sheen";
import type { ActivityTimelineItem } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartData } from "@gemologic/sheen-charts/core";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { PageHeader, StatusBar } from "@gemologic/sheen-patterns";
import { AdminApp } from "@gemologic/sheen-patterns/admin";
import type { AdminPlacementOverride } from "@gemologic/sheen-patterns/admin";
import { DataTable, QueryBuilder, defineColumns } from "@gemologic/sheen-table";
import type { FilterNode, QueryBuilderColumn } from "@gemologic/sheen-table/core";
import { createSignal } from "solid-js";${mode === "structure-only" ? '\nimport type { JSX } from "solid-js";' : ""}`;
}

function placementsCode(document: ComposerDocument): string {
  const entries = composerPlacements(document).map(item => `  { zone: ${quote(item.zone)}, target: ${quote(item.target)} },`).join("\n");
  return `const placements = [\n${entries}\n] satisfies readonly AdminPlacementOverride[];`;
}

function renderApplication(document: ComposerDocument, mode: ComposerGenerationMode): string {
  const pageHeader = nodesCode(regionComponents(document, "page-header"), 3, mode);
  const toolbar = nodesCode(regionComponents(document, "toolbar"), 3, mode);
  const main = nodesCode(regionComponents(document, "main-grid"), 3, mode);
  const details = nodesCode(regionComponents(document, "details-panel"), 0, mode);
  const status = nodesCode(regionComponents(document, "status-bar"), 0, mode);
  const functionStart = mode === "structure-only" ? "export default function GeneratedAdminApp(props: GeneratedAdminProps)" : "export default function GeneratedAdminApp()";
  const dataAliases = mode === "structure-only" ? "\n  const records = props.records;\n  const activity = props.activity;\n  const chartData = props.chartData;" : "";
  const toolbarExtra = mode === "structure-only" ? "\n      {props.toolbarExtras}" : "";
  const mainExtra = mode === "structure-only" ? "\n      {props.mainExtras}" : "";
  const detailsExtra = mode === "structure-only" ? "\n{props.detailsExtras}" : "";
  const statusExtra = mode === "structure-only" ? "\n{props.statusExtras}" : "";
  const app = `<AdminApp
      label=${quote(`${document.title} application`)}
      pathname="/accounts"
      preset=${quote(document.preset)}
      appearance={${JSON.stringify(document.appearance)}}
      placements={placements}
      product={{ name: ${quote(document.title)}, href: "/" }}
      workspace={{ label: "Workspace", currentId: workspace(), items: [{ id: "production", label: "Production" }, { id: "staging", label: "Staging" }], onChange: setWorkspace }}
      primaryNavigation={{ id: "primary", label: "Primary navigation", items: [{ kind: "link", id: "overview", label: "Overview", href: "/" }, { kind: "link", id: "accounts", label: "Accounts", href: "/accounts", match: "prefix" }] }}
      currentView={<strong>Accounts</strong>}
      globalSearch={<SearchInput label="Search application" />}
      actionGroups={[{ id: "create", label: "Create", role: "primary", items: [{ kind: "action", id: "new", label: "New account", onSelect: () => setDetailsOpen(true) }] }]}
      notifications={{ items: [{ kind: "link", id: "deployed", title: "Deploy completed", href: "/", timeLabel: "4 minutes ago" }] }}
      account={{ id: "ada", name: "Ada Lovelace", email: "ada@northstar.example.test", items: [{ kind: "action", id: "profile", label: "Profile settings", onSelect: () => undefined }] }}
      commandPalette={{ sources: [{ kind: "static", id: "application", commands: [{ id: "accounts", label: "Open accounts", group: "Navigation", run: () => undefined }] }] }}
      details={{ id: "details", title: "Account details", open: detailsOpen(), onOpenChange: setDetailsOpen, content: <>
${indent(details, 4)}${indent(detailsExtra, 4)}
      </> }}
      statusBar={<StatusBar connection="connected" tasks={0} counts={[{ label: "Records", value: records.length }]}><>
${indent(status, 4)}${indent(statusExtra, 4)}
      </></StatusBar>}
    >
      <Stack gap="lg">
${pageHeader}
${toolbar}${toolbarExtra}
${main}${mainExtra}
      </Stack>
    </AdminApp>`;
  const wrapped = mode === "self-contained" ? `<ThemeProvider>\n${indent(app, 2)}\n  </ThemeProvider>` : app;
  return `${functionStart} {
  const [workspace, setWorkspace] = createSignal("production");
  const [detailsOpen, setDetailsOpen] = createSignal(true);${dataAliases}
  const [queryFilter, setQueryFilter] = createSignal<FilterNode>(initialQuery);
  return (
  ${wrapped}
  );
}`;
}

export function generateComposerTsx(document: ComposerDocument, fixtures: ComposerFixtureCatalog, mode: ComposerGenerationMode): string {
  const result = readComposerDocument(document);
  if (!result.ok) throw new Error(result.errors.map(item => `${item.path}: ${item.message}`).join("\n"));
  return `${imports(mode)}\n\n${fixturePrelude(fixtures, mode)}\n\n${placementsCode(result.document)}\n\n${renderApplication(result.document, mode)}\n`;
}
