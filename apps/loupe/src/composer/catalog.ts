import type { ComposerComponentName, ComposerComponentNode, ComposerRegionId, ComposerScalar } from "./model.ts";
import { composerComponentRules } from "./model.ts";

export interface ComposerPropChoice {
  readonly value: ComposerScalar;
  readonly label: string;
}

export interface ComposerPropEditor {
  readonly name: string;
  readonly label: string;
  readonly kind: "text" | "number" | "boolean" | "select";
  readonly choices?: readonly ComposerPropChoice[];
}

export interface ComposerCatalogEntry {
  readonly component: ComposerComponentName;
  readonly label: string;
  readonly summary: string;
  readonly defaultProps: Readonly<Record<string, ComposerScalar>>;
  readonly defaultFixture?: string;
  readonly editors: readonly ComposerPropEditor[];
}

function choices(...values: readonly ComposerScalar[]): readonly ComposerPropChoice[] {
  return values.map(value => ({ value, label: String(value) }));
}

export const composerCatalog: readonly ComposerCatalogEntry[] = Object.freeze([
  { component: "Stack", label: "Stack", summary: "Vertical flow for a related group.", defaultProps: { gap: "md", align: "stretch", justify: "start" }, editors: [
    { name: "gap", label: "Gap", kind: "select", choices: choices("none", "xs", "sm", "md", "lg", "xl") },
    { name: "align", label: "Alignment", kind: "select", choices: choices("start", "center", "end", "stretch") },
    { name: "justify", label: "Distribution", kind: "select", choices: choices("start", "center", "end", "between") },
  ] },
  { component: "Grid", label: "Grid", summary: "Responsive equal-width application grid.", defaultProps: { columns: 2, gap: "md", align: "stretch" }, editors: [
    { name: "columns", label: "Columns", kind: "select", choices: choices(1, 2, 3, 4, 5, 6) },
    { name: "gap", label: "Gap", kind: "select", choices: choices("none", "xs", "sm", "md", "lg", "xl") },
    { name: "align", label: "Alignment", kind: "select", choices: choices("start", "center", "end", "stretch") },
  ] },
  { component: "Card", label: "Card", summary: "A semantic raised or inset surface.", defaultProps: { variant: "raised", padding: "lg", bordered: true, elevated: false }, editors: [
    { name: "variant", label: "Surface", kind: "select", choices: choices("base", "subtle", "raised", "inset") },
    { name: "padding", label: "Padding", kind: "select", choices: choices("none", "xs", "sm", "md", "lg", "xl") },
    { name: "bordered", label: "Bordered", kind: "boolean" },
    { name: "elevated", label: "Elevated", kind: "boolean" },
  ] },
  { component: "Heading", label: "Heading", summary: "Semantic heading with editable copy.", defaultProps: { level: 2, size: "h3", children: "Section heading" }, defaultFixture: "lorem-title", editors: [
    { name: "children", label: "Text", kind: "text" },
    { name: "level", label: "Level", kind: "select", choices: choices(1, 2, 3, 4, 5, 6) },
    { name: "size", label: "Visual size", kind: "select", choices: choices("h1", "h2", "h3", "h4") },
  ] },
  { component: "Text", label: "Text", summary: "Application copy with accessible muted tone.", defaultProps: { size: "body", tone: "default", numeric: false, children: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." }, defaultFixture: "lorem-body", editors: [
    { name: "children", label: "Text", kind: "text" },
    { name: "size", label: "Size", kind: "select", choices: choices("caption", "ui-sm", "ui", "body") },
    { name: "tone", label: "Tone", kind: "select", choices: choices("default", "muted") },
    { name: "numeric", label: "Tabular figures", kind: "boolean" },
  ] },
  { component: "Button", label: "Button", summary: "An application action, not navigation.", defaultProps: { children: "Action", variant: "ghost", tone: "neutral", size: "md", loading: false, disabled: false }, defaultFixture: "secondary-action", editors: [
    { name: "children", label: "Label", kind: "text" },
    { name: "variant", label: "Variant", kind: "select", choices: choices("solid", "soft", "outline", "ghost", "link") },
    { name: "tone", label: "Tone", kind: "select", choices: choices("neutral", "accent", "danger", "success") },
    { name: "size", label: "Size", kind: "select", choices: choices("xs", "sm", "md", "lg") },
    { name: "loading", label: "Loading", kind: "boolean" },
    { name: "disabled", label: "Disabled", kind: "boolean" },
  ] },
  { component: "Input", label: "Input", summary: "A labeled native text draft.", defaultProps: { label: "Field label", placeholder: "Enter a value", disabled: false, required: false }, defaultFixture: "user-name", editors: [
    { name: "label", label: "Label", kind: "text" },
    { name: "placeholder", label: "Placeholder", kind: "text" },
    { name: "required", label: "Required", kind: "boolean" },
    { name: "disabled", label: "Disabled", kind: "boolean" },
  ] },
  { component: "PageHeader", label: "Page header", summary: "The current view title and action seam.", defaultProps: { title: "Page title", headingLevel: 1 }, defaultFixture: "application-heading", editors: [
    { name: "title", label: "Title", kind: "text" },
    { name: "headingLevel", label: "Heading level", kind: "select", choices: choices(1, 2, 3, 4, 5, 6) },
  ] },
  { component: "QueryBuilder", label: "Query builder", summary: "Nested typed filters shared with a data table.", defaultProps: { label: "Account query", disabled: false }, defaultFixture: "query-filter", editors: [
    { name: "label", label: "Label", kind: "text" },
    { name: "disabled", label: "Disabled", kind: "boolean" },
  ] },
  { component: "DataTable", label: "Data table", summary: "Searchable, filterable records with local density.", defaultProps: { caption: "Application records", pagination: true, density: "compact" }, defaultFixture: "records", editors: [
    { name: "caption", label: "Caption", kind: "text" },
    { name: "pagination", label: "Numbered pagination", kind: "boolean" },
    { name: "density", label: "Density", kind: "select", choices: choices("compact", "comfortable", "spacious") },
  ] },
  { component: "ActivityTimeline", label: "Activity timeline", summary: "Deterministic application events.", defaultProps: { label: "Recent activity", density: "compact", refreshing: false }, defaultFixture: "activity", editors: [
    { name: "label", label: "Label", kind: "text" },
    { name: "density", label: "Density", kind: "select", choices: choices("compact", "default") },
    { name: "refreshing", label: "Refreshing", kind: "boolean" },
  ] },
  { component: "TimeSeries", label: "Time series", summary: "Accessible latency chart with table output.", defaultProps: { label: "API latency", summary: "Latency over time.", xLabel: "Time", height: 220, legend: "inline", tooltip: true }, defaultFixture: "latency-chart", editors: [
    { name: "label", label: "Label", kind: "text" },
    { name: "summary", label: "Summary", kind: "text" },
    { name: "xLabel", label: "X-axis label", kind: "text" },
    { name: "height", label: "Height", kind: "number" },
    { name: "legend", label: "Legend", kind: "select", choices: choices("inline", "stacked", false) },
    { name: "tooltip", label: "Tooltip", kind: "boolean" },
  ] },
]);

export function composerCatalogEntry(component: ComposerComponentName): ComposerCatalogEntry {
  const entry = composerCatalog.find(candidate => candidate.component === component);
  if (!entry) throw new Error(`Missing Composer catalog entry for ${component}`);
  return entry;
}

export function createComposerNode(component: ComposerComponentName, id: string): ComposerComponentNode {
  if (!id.trim()) throw new Error("Composer node ID must be nonempty");
  const entry = composerCatalogEntry(component);
  return Object.freeze({ type: "component", id, component, props: Object.freeze({ ...entry.defaultProps }), ...(entry.defaultFixture === undefined ? {} : { fixture: entry.defaultFixture }), children: Object.freeze([]) });
}

export function composerAllowedRegions(component: ComposerComponentName): readonly ComposerRegionId[] {
  return composerComponentRules[component].regions;
}
