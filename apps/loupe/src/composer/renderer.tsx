import { ActivityTimeline, Button, Card, Grid, Heading, Input, SearchInput, Stack, Text } from "@gemologic/sheen";
import type { Alignment, ButtonProps, Justification, Spacing, TextProps } from "@gemologic/sheen";
import { TimeSeries } from "@gemologic/sheen-charts/time-series";
import { AdminApp } from "@gemologic/sheen-patterns/admin";
import type { AdminAccountModel, AdminActionGroup, AdminDetailsModel, AdminNavigationModel, AdminNotificationModel, AdminWorkspaceModel } from "@gemologic/sheen-patterns/admin";
import { PageHeader, StatusBar } from "@gemologic/sheen-patterns";
import type { RouterAdapter } from "@gemologic/sheen-patterns";
import { DataTable, QueryBuilder, defineColumns } from "@gemologic/sheen-table";
import type { FilterNode, QueryBuilderColumn, TablePagination } from "@gemologic/sheen-table";
import { For, Match, Switch, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";
import type { ComposerRecordFixture, ComposerFixtureCatalog } from "./fixtures.ts";
import type { ComposerComponentNode, ComposerDocument, ComposerRegionId, ComposerScalar } from "./model.ts";
import { composerPlacements, composerRegion } from "./model.ts";

const recordColumns = defineColumns<ComposerRecordFixture>([
  { id: "account", header: "Account", accessor: row => row.account, search: true, filter: { type: "text" }, sort: "text", width: "fill" },
  { id: "owner", header: "Owner", accessor: row => row.owner, search: true, filter: { type: "text" }, sort: "text", width: 180 },
  { id: "status", header: "Status", accessor: row => row.status, search: true, filter: { type: "enum", options: ["Active", "Review", "Paused"], faceted: true }, sort: "text", width: 120 },
  { id: "amount", header: "Amount", accessor: row => row.amount, filter: { type: "number" }, sort: "number", numeric: true, width: 140 },
]);
const queryColumns = [
  { id: "account", label: "Account", type: "text" },
  { id: "owner", label: "Owner", type: "text" },
  { id: "status", label: "Status", type: "enum", options: ["Active", "Review", "Paused"] },
  { id: "amount", label: "Amount", type: "number" },
] satisfies readonly QueryBuilderColumn[];
const initialQuery: FilterNode = Object.freeze({ kind: "and", children: Object.freeze([
  Object.freeze({ kind: "enum", column: "status", operator: "in", values: Object.freeze(["Active", "Review", "Paused"]) }),
]) });

function scalar(node: ComposerComponentNode, name: string): ComposerScalar | undefined {
  return node.props[name];
}

function stringProp(node: ComposerComponentNode, name: string, fallback: string): string {
  const value = scalar(node, name);
  return typeof value === "string" ? value : fallback;
}

function numberProp(node: ComposerComponentNode, name: string, fallback: number): number {
  const value = scalar(node, name);
  return typeof value === "number" ? value : fallback;
}

function booleanProp(node: ComposerComponentNode, name: string, fallback: boolean): boolean {
  const value = scalar(node, name);
  return typeof value === "boolean" ? value : fallback;
}

function tableDensity(node: ComposerComponentNode): "compact" | "comfortable" | "spacious" {
  const value = scalar(node, "density");
  return value === "comfortable" || value === "spacious" ? value : "compact";
}

function spacingProp(node: ComposerComponentNode, name: string, fallback: Spacing): Spacing {
  const value = scalar(node, name);
  return value === "none" || value === "xs" || value === "sm" || value === "md" || value === "lg" || value === "xl" ? value : fallback;
}

function alignmentProp(node: ComposerComponentNode, fallback: Alignment): Alignment {
  const value = scalar(node, "align");
  return value === "start" || value === "center" || value === "end" || value === "stretch" ? value : fallback;
}

function justificationProp(node: ComposerComponentNode, fallback: Justification): Justification {
  const value = scalar(node, "justify");
  return value === "start" || value === "center" || value === "end" || value === "between" ? value : fallback;
}

function columnsProp(node: ComposerComponentNode): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  const value = scalar(node, "columns");
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7 || value === 8 || value === 9 || value === 10 || value === 11 || value === 12 ? value : 1;
}

function headingLevel(node: ComposerComponentNode): 1 | 2 | 3 | 4 | 5 | 6 {
  const value = scalar(node, node.component === "PageHeader" ? "headingLevel" : "level");
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 6 ? value : 1;
}

function headingSize(node: ComposerComponentNode): "h1" | "h2" | "h3" | "h4" | undefined {
  const value = scalar(node, "size");
  return value === "h1" || value === "h2" || value === "h3" || value === "h4" ? value : undefined;
}

function textSize(node: ComposerComponentNode): NonNullable<TextProps["size"]> {
  const value = scalar(node, "size");
  return value === "caption" || value === "ui-sm" || value === "body" ? value : "ui";
}

function buttonVariant(node: ComposerComponentNode): NonNullable<ButtonProps["variant"]> {
  const value = scalar(node, "variant");
  return value === "solid" || value === "soft" || value === "outline" || value === "link" ? value : "ghost";
}

function buttonTone(node: ComposerComponentNode): NonNullable<ButtonProps["tone"]> {
  const value = scalar(node, "tone");
  return value === "accent" || value === "danger" || value === "success" ? value : "neutral";
}

function buttonSize(node: ComposerComponentNode): NonNullable<ButtonProps["size"]> {
  const value = scalar(node, "size");
  return value === "xs" || value === "sm" || value === "lg" ? value : "md";
}

function regionNodes(document: ComposerDocument, region: ComposerRegionId): readonly ComposerComponentNode[] {
  return composerRegion(document, region).nodes.filter(node => node.type === "component");
}

export interface ComposerNodeViewProps {
  readonly node: ComposerComponentNode;
  readonly region: ComposerRegionId;
  readonly fixtures: ComposerFixtureCatalog;
  readonly selectedId?: string | undefined;
  readonly onSelect?: ((id: string) => void) | undefined;
  readonly onPrimaryAction?: (() => void) | undefined;
  readonly queryFilter: FilterNode;
  readonly onQueryFilterChange: (filter: FilterNode) => void;
}

function NodeChildren(props: ComposerNodeViewProps): JSX.Element {
  return <For each={props.node.children}>{child => <ComposerNodeView node={child} region={props.region} fixtures={props.fixtures}
    {...(props.selectedId === undefined ? {} : { selectedId: props.selectedId })} {...(props.onSelect === undefined ? {} : { onSelect: props.onSelect })}
    {...(props.onPrimaryAction === undefined ? {} : { onPrimaryAction: props.onPrimaryAction })}
    queryFilter={props.queryFilter} onQueryFilterChange={props.onQueryFilterChange} />}</For>;
}

export function ComposerNodeView(props: ComposerNodeViewProps): JSX.Element {
  const select = (): void => props.onSelect?.(props.node.id);
  const component = (): JSX.Element => <Switch fallback={<Text>Unsupported Composer component</Text>}>
    <Match when={props.node.component === "Stack"}><Stack gap={spacingProp(props.node, "gap", "md")} align={alignmentProp(props.node, "stretch")} justify={justificationProp(props.node, "start")}><NodeChildren {...props} /></Stack></Match>
    <Match when={props.node.component === "Grid"}><Grid columns={columnsProp(props.node)} gap={spacingProp(props.node, "gap", "md")} align={alignmentProp(props.node, "stretch")}><NodeChildren {...props} /></Grid></Match>
    <Match when={props.node.component === "Card"}><Card variant={stringProp(props.node, "variant", "raised") === "base" ? "base" : stringProp(props.node, "variant", "raised") === "subtle" ? "subtle" : stringProp(props.node, "variant", "raised") === "inset" ? "inset" : "raised"}
      padding={spacingProp(props.node, "padding", "lg")} bordered={booleanProp(props.node, "bordered", true)} elevated={booleanProp(props.node, "elevated", false)}><NodeChildren {...props} /></Card></Match>
    <Match when={props.node.component === "Heading"}><Heading level={headingLevel(props.node)} size={headingSize(props.node) ?? "h3"}>{stringProp(props.node, "children", props.fixtures.lorem.title)}</Heading></Match>
    <Match when={props.node.component === "Text"}><Text size={textSize(props.node)} tone={stringProp(props.node, "tone", "default") === "muted" ? "muted" : "default"} numeric={booleanProp(props.node, "numeric", false)}>{stringProp(props.node, "children", props.fixtures.lorem.body)}</Text></Match>
    <Match when={props.node.component === "Button"}><Button variant={buttonVariant(props.node)} tone={buttonTone(props.node)} size={buttonSize(props.node)} disabled={booleanProp(props.node, "disabled", false)} loading={booleanProp(props.node, "loading", false)}
      {...(props.node.fixture === "primary-action" && props.onPrimaryAction ? { onClick: props.onPrimaryAction } : {})}>{stringProp(props.node, "children", "Action")}</Button></Match>
    <Match when={props.node.component === "Input"}><Input label={stringProp(props.node, "label", "Field")} placeholder={stringProp(props.node, "placeholder", "Enter a value")} disabled={booleanProp(props.node, "disabled", false)} required={booleanProp(props.node, "required", false)} /></Match>
    <Match when={props.node.component === "PageHeader"}><PageHeader title={stringProp(props.node, "title", props.fixtures.lorem.title)} headingLevel={headingLevel(props.node)} /></Match>
    <Match when={props.node.component === "QueryBuilder"}><QueryBuilder columns={queryColumns} value={props.queryFilter} onChange={props.onQueryFilterChange}
      label={stringProp(props.node, "label", "Account query")} disabled={booleanProp(props.node, "disabled", false)} /></Match>
    <Match when={props.node.component === "DataTable"}><DataTable data={props.fixtures.records} columns={recordColumns} getRowId={row => row.id} caption={stringProp(props.node, "caption", "Records")}
      variant="integrated" density={tableDensity(props.node)} pagination={booleanProp(props.node, "pagination", true) ? { pageIndex: 0, pageSize: 12 } satisfies TablePagination : false}
      filter={props.queryFilter} onAcceptedStateChange={state => props.onQueryFilterChange(state.filter)} search={{}} filterBar columnControls export={{ filename: "composer-records" }} initialViewportHeight={320} mobileLayout={{ pageSize: 12, titleColumn: "account" }} /></Match>
    <Match when={props.node.component === "ActivityTimeline"}><ActivityTimeline label={stringProp(props.node, "label", "Activity")} items={props.fixtures.activity}
      density={stringProp(props.node, "density", "default") === "compact" ? "compact" : "default"} refreshing={booleanProp(props.node, "refreshing", false)} /></Match>
    <Match when={props.node.component === "TimeSeries"}><TimeSeries label={stringProp(props.node, "label", "Latency")} summary={stringProp(props.node, "summary", "Latency over time.")} xLabel={stringProp(props.node, "xLabel", "Time")}
      series={props.fixtures.chart.series} data={props.fixtures.chart.data} x={{ type: "time", tz: "UTC" }} y={{ format: "duration" }} height={numberProp(props.node, "height", 220)}
      legend={stringProp(props.node, "legend", "inline") === "stacked" ? "stacked" : scalar(props.node, "legend") === false ? false : "inline"} tooltip={booleanProp(props.node, "tooltip", true)} /></Match>
  </Switch>;
  return <div class="loupe-composer-node" data-composer-node-id={props.node.id} data-composer-component={props.node.component} data-selected={props.selectedId === props.node.id || undefined}
    role="group" aria-label={`${props.node.component} block`} tabIndex={0}
    onFocus={event => { event.stopPropagation(); select(); }} onPointerDown={event => { event.stopPropagation(); select(); }}>
    <div class="loupe-composer-node-label"><span>{props.node.component}</span><Button class="loupe-composer-drag-handle" size="xs" data-composer-drag-handle aria-label={`Drag ${props.node.component} block`}>Drag</Button></div>
    {component()}
  </div>;
}

export interface ComposerPreviewProps {
  readonly document: ComposerDocument;
  readonly fixtures: ComposerFixtureCatalog;
  readonly router?: RouterAdapter;
  readonly selectedId?: string | undefined;
  readonly onSelect?: ((id: string) => void) | undefined;
}

export function ComposerPreview(props: ComposerPreviewProps): JSX.Element {
  const [workspaceId, setWorkspaceId] = createSignal("production");
  const [detailsOpen, setDetailsOpen] = createSignal(true);
  const [queryFilter, setQueryFilter] = createSignal<FilterNode>(initialQuery);
  const primaryNavigation: AdminNavigationModel = { id: "primary", label: "Primary navigation", items: [
    { kind: "link", id: "overview", label: "Overview", href: "/composer-preview" },
    { kind: "link", id: "accounts", label: "Accounts", href: "/composer-preview/accounts", match: "prefix" },
    { kind: "group", id: "operations", label: "Operations", items: [{ kind: "link", id: "deployments", label: "Deployments", href: "/composer-preview/deployments", match: "prefix" }] },
  ] };
  const workspace = createMemo<AdminWorkspaceModel>(() => ({ label: "Workspace", currentId: workspaceId(), items: [
    { id: "production", label: "Production", description: "US East" },
    { id: "staging", label: "Staging", description: "Internal" },
  ], onChange: setWorkspaceId }));
  const account: AdminAccountModel = { id: "ada", name: "Ada Lovelace", email: "ada@northstar.example.test", menuLabel: "Open Ada Lovelace account menu", items: [
    { kind: "action", id: "profile", label: "Profile settings", onSelect: () => undefined },
    { kind: "separator", id: "separator" },
    { kind: "action", id: "sign-out", label: "Sign out", onSelect: () => undefined },
  ] };
  const notifications: AdminNotificationModel = { items: [
    { kind: "link", id: "deployed", title: "Deploy completed", description: "Production is serving revision 1842.", timeLabel: "4 minutes ago", href: "/composer-preview" },
    { kind: "link", id: "review", title: "Review requested", description: "Eight accounts need an owner.", timeLabel: "18 minutes ago", href: "/composer-preview/accounts" },
  ] };
  const actions: readonly AdminActionGroup[] = [{ id: "create", label: "Create", role: "primary", items: [{ kind: "action", id: "new", label: "New account", onSelect: () => setDetailsOpen(true) }] },
    { id: "help", label: "Help", role: "help", items: [{ kind: "link", id: "docs", label: "Docs", href: "/components" }] }];
  const renderRegion = (id: ComposerRegionId): JSX.Element => <For each={regionNodes(props.document, id)}>{node => <ComposerNodeView node={node} region={id} fixtures={props.fixtures}
    {...(props.selectedId === undefined ? {} : { selectedId: props.selectedId })} {...(props.onSelect === undefined ? {} : { onSelect: props.onSelect })}
    onPrimaryAction={() => { setDetailsOpen(true); }} queryFilter={queryFilter()} onQueryFilterChange={setQueryFilter} />}</For>;
  const details = createMemo<AdminDetailsModel | undefined>(() => {
    if (!regionNodes(props.document, "details-panel").length) return undefined;
    return { id: "composer-details", title: "Details", open: detailsOpen(), resizable: true, onOpenChange: setDetailsOpen, content: renderRegion("details-panel") };
  });
  return <AdminApp label={`${props.document.title} preview`} documentTitle={`${props.document.title} · Composer`} preset={props.document.preset} appearance={props.document.appearance}
    placements={composerPlacements(props.document)} pathname="/composer-preview" {...(props.router === undefined ? {} : { router: props.router })}
    product={{ name: props.document.title, href: "/composer-preview", mark: <span>N</span> }} workspace={workspace()} primaryNavigation={primaryNavigation}
    currentView={<strong>Accounts</strong>} globalSearch={<SearchInput label="Search application" />} actionGroups={actions} notifications={notifications} account={account}
    commandPalette={{ sources: [{ kind: "static", id: "composer", commands: [{ id: "accounts", label: "Open accounts", group: "Navigation", run: () => undefined }] }] }}
    details={details()} statusBar={<StatusBar connection="connected" tasks={0} counts={[{ label: "Records", value: props.fixtures.records.length }]}>{renderRegion("status-bar")}</StatusBar>}>
    <div class="loupe-composer-preview-content" data-composer-preview-content>
      {renderRegion("page-header")}
      {renderRegion("toolbar")}
      {renderRegion("main-grid")}
      {renderRegion("overlays")}
    </div>
  </AdminApp>;
}
