import { adminChromeTargets, adminChromeZones, adminPlacementTargets, resolveAdminAppearance, resolveAdminPlacements } from "@gemologic/sheen-patterns/admin-config";
import type { AdminAppearance, AdminChromeTarget, AdminChromeZone, AdminPlacementOverride, AdminPreset } from "@gemologic/sheen-patterns/admin-config";

export const composerSchemaVersion = 1;

export const composerRegionIds = [
  "topbar",
  "sidebar",
  "page-header",
  "toolbar",
  "main-grid",
  "details-panel",
  "status-bar",
  "overlays",
] as const;

export type ComposerRegionId = (typeof composerRegionIds)[number];

export const composerComponentNames = [
  "Stack",
  "Grid",
  "Card",
  "Heading",
  "Text",
  "Button",
  "Input",
  "PageHeader",
  "QueryBuilder",
  "DataTable",
  "ActivityTimeline",
  "TimeSeries",
] as const;

export type ComposerComponentName = (typeof composerComponentNames)[number];
export type ComposerScalar = string | number | boolean | null;

export interface ComposerPlacementNode {
  readonly type: "placement";
  readonly id: string;
  readonly zone: AdminChromeZone;
  readonly target: AdminChromeTarget;
}

export interface ComposerComponentNode {
  readonly type: "component";
  readonly id: string;
  readonly component: ComposerComponentName;
  readonly props: Readonly<Record<string, ComposerScalar>>;
  readonly fixture?: string;
  readonly children: readonly ComposerComponentNode[];
}

export type ComposerNode = ComposerPlacementNode | ComposerComponentNode;

export interface ComposerRegion {
  readonly id: ComposerRegionId;
  readonly nodes: readonly ComposerNode[];
}

export interface ComposerDocument {
  readonly schemaVersion: typeof composerSchemaVersion;
  readonly id: string;
  readonly title: string;
  readonly preset: AdminPreset;
  readonly appearance: AdminAppearance;
  readonly regions: readonly ComposerRegion[];
}

export type ComposerValidationCode =
  | "invalid-document"
  | "invalid-schema"
  | "invalid-region"
  | "missing-region"
  | "duplicate-region"
  | "invalid-node"
  | "duplicate-node"
  | "duplicate-placement"
  | "invalid-parent"
  | "invalid-prop"
  | "invalid-fixture";

export interface ComposerValidationError {
  readonly code: ComposerValidationCode;
  readonly path: string;
  readonly message: string;
}

export type ComposerReadResult =
  | { readonly ok: true; readonly document: ComposerDocument; readonly migratedFrom?: number }
  | { readonly ok: false; readonly errors: readonly ComposerValidationError[] };

interface ComponentRule {
  readonly regions: readonly ComposerRegionId[];
  readonly props: Readonly<Record<string, (value: ComposerScalar) => boolean>>;
  readonly fixtures: readonly string[];
  readonly acceptsChildren: boolean;
}

const spacing = ["none", "xs", "sm", "md", "lg", "xl"] as const;
const alignment = ["start", "center", "end", "stretch"] as const;
const justification = ["start", "center", "end", "between"] as const;

function oneOf<T extends ComposerScalar>(values: readonly T[]): (value: ComposerScalar) => boolean {
  return value => values.some(candidate => candidate === value);
}

function nonempty(value: ComposerScalar): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function finite(value: ComposerScalar): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function integer(minimum: number, maximum: number): (value: ComposerScalar) => boolean {
  return value => typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function boolean(value: ComposerScalar): boolean {
  return typeof value === "boolean";
}

const contentRegions: readonly ComposerRegionId[] = ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"];
const bodyRegions: readonly ComposerRegionId[] = ["toolbar", "main-grid", "details-panel", "overlays"];

export const composerComponentRules: Readonly<Record<ComposerComponentName, ComponentRule>> = Object.freeze({
  Stack: { regions: contentRegions, props: { gap: oneOf(spacing), align: oneOf(alignment), justify: oneOf(justification) }, fixtures: [], acceptsChildren: true },
  Grid: { regions: bodyRegions, props: { columns: integer(1, 12), gap: oneOf(spacing), align: oneOf(alignment) }, fixtures: [], acceptsChildren: true },
  Card: { regions: bodyRegions, props: { variant: oneOf(["base", "subtle", "raised", "inset"]), padding: oneOf(spacing), bordered: boolean, elevated: boolean }, fixtures: [], acceptsChildren: true },
  Heading: { regions: contentRegions, props: { level: integer(1, 6), size: oneOf(["h1", "h2", "h3", "h4"]), children: nonempty }, fixtures: ["lorem-title"], acceptsChildren: false },
  Text: { regions: contentRegions, props: { size: oneOf(["caption", "ui-sm", "ui", "body"]), tone: oneOf(["default", "muted"]), numeric: boolean, children: nonempty }, fixtures: ["lorem-body", "multilingual"], acceptsChildren: false },
  Button: { regions: contentRegions, props: { children: nonempty, variant: oneOf(["solid", "soft", "outline", "ghost", "link"]), tone: oneOf(["neutral", "accent", "danger", "success"]), size: oneOf(["xs", "sm", "md", "lg"]), loading: boolean, disabled: boolean }, fixtures: ["primary-action", "secondary-action"], acceptsChildren: false },
  Input: { regions: bodyRegions, props: { label: nonempty, placeholder: nonempty, disabled: boolean, required: boolean }, fixtures: ["user-name", "workspace-name"], acceptsChildren: false },
  PageHeader: { regions: ["page-header"], props: { title: nonempty, headingLevel: integer(1, 6) }, fixtures: ["application-heading"], acceptsChildren: false },
  QueryBuilder: { regions: ["toolbar", "main-grid", "details-panel"], props: { label: nonempty, disabled: boolean }, fixtures: ["query-filter"], acceptsChildren: false },
  DataTable: { regions: ["main-grid"], props: { caption: nonempty, pagination: oneOf([true, false]), density: oneOf(["compact", "comfortable", "spacious"]) }, fixtures: ["records"], acceptsChildren: false },
  ActivityTimeline: { regions: ["main-grid", "details-panel"], props: { label: nonempty, density: oneOf(["compact", "default"]), refreshing: boolean }, fixtures: ["activity"], acceptsChildren: false },
  TimeSeries: { regions: ["main-grid", "details-panel"], props: { label: nonempty, summary: nonempty, xLabel: nonempty, height: finite, legend: oneOf(["inline", "stacked", false]), tooltip: boolean }, fixtures: ["latency-chart"], acceptsChildren: false },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is ComposerScalar {
  return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value));
}

function isRegionId(value: unknown): value is ComposerRegionId {
  return typeof value === "string" && composerRegionIds.some(region => region === value);
}

function isComponentName(value: unknown): value is ComposerComponentName {
  return typeof value === "string" && composerComponentNames.some(component => component === value);
}

function isAdminPreset(value: unknown): value is AdminPreset {
  return value === "standard" || value === "workspace" || value === "horizontal" || value === "inspector";
}

function isChromeAppearance(value: unknown): value is NonNullable<AdminAppearance["chrome"]> {
  return value === "layered" || value === "unified" || value === "tonal";
}

function isNavigationAppearance(value: unknown): value is NonNullable<AdminAppearance["navigation"]> {
  return value === "subtle" || value === "accent" || value === "indicator";
}

function isActionAppearance(value: unknown): value is NonNullable<AdminAppearance["actions"]> {
  return value === "quiet" || value === "outlined" || value === "accent";
}

function isChromeZone(value: unknown): value is AdminChromeZone {
  return typeof value === "string" && adminChromeZones.some(zone => zone === value);
}

function isChromeTarget(value: unknown): value is AdminChromeTarget {
  return typeof value === "string" && adminChromeTargets.some(target => target === value);
}

function error(errors: ComposerValidationError[], code: ComposerValidationCode, path: string, message: string): void {
  errors.push({ code, path, message });
}

function readProps(value: unknown, component: ComposerComponentName, path: string, errors: ComposerValidationError[]): Readonly<Record<string, ComposerScalar>> | undefined {
  if (!isRecord(value)) {
    error(errors, "invalid-prop", path, `${component} props must be an object of scalar values`);
    return undefined;
  }
  const result: Record<string, ComposerScalar> = {};
  const validators = composerComponentRules[component].props;
  for (const name of Object.keys(value).sort()) {
    const candidate = value[name];
    if (!isScalar(candidate) || !(name in validators)) {
      error(errors, "invalid-prop", `${path}.${name}`, `${component}.${name} is not an editable safe prop`);
      continue;
    }
    const validator = validators[name];
    if (!validator?.(candidate)) {
      error(errors, "invalid-prop", `${path}.${name}`, `${component}.${name} has an invalid value`);
      continue;
    }
    result[name] = candidate;
  }
  return Object.freeze(result);
}

interface ValidationContext {
  readonly errors: ComposerValidationError[];
  readonly ids: Set<string>;
  readonly zones: Set<AdminChromeZone>;
}

function readPlacement(value: Record<string, unknown>, region: ComposerRegionId, path: string, context: ValidationContext): ComposerPlacementNode | undefined {
  if (typeof value.id !== "string" || !value.id.trim() || !isChromeZone(value.zone) || !isChromeTarget(value.target)) {
    error(context.errors, "invalid-node", path, "Placement nodes require a nonempty ID plus supported zone and target");
    return undefined;
  }
  if (region !== "topbar" && region !== "sidebar") error(context.errors, "invalid-parent", path, "Placement nodes belong only to topbar or sidebar regions");
  const targetRegion: ComposerRegionId = value.target.startsWith("topbar-") ? "topbar" : "sidebar";
  if (targetRegion !== region) error(context.errors, "invalid-parent", path, `${value.target} belongs in the ${targetRegion} region`);
  if (!adminPlacementTargets[value.zone].includes(value.target)) error(context.errors, "invalid-parent", path, `${value.zone} cannot be placed at ${value.target}`);
  if (context.zones.has(value.zone)) error(context.errors, "duplicate-placement", `${path}.zone`, `Placement zone ${value.zone} appears more than once`);
  context.zones.add(value.zone);
  return Object.freeze({ type: "placement", id: value.id, zone: value.zone, target: value.target });
}

function readComponent(value: Record<string, unknown>, region: ComposerRegionId, path: string, context: ValidationContext, parentAcceptsChildren: boolean): ComposerComponentNode | undefined {
  if (typeof value.id !== "string" || !value.id.trim() || !isComponentName(value.component)) {
    error(context.errors, "invalid-node", path, "Component nodes require a nonempty ID and supported component name");
    return undefined;
  }
  const rule = composerComponentRules[value.component];
  if (!rule.regions.includes(region)) error(context.errors, "invalid-parent", path, `${value.component} is not allowed in ${region}`);
  if (!parentAcceptsChildren) error(context.errors, "invalid-parent", path, "The parent component does not accept children");
  const props = readProps(value.props, value.component, `${path}.props`, context.errors);
  const fixture = value.fixture;
  if (fixture !== undefined && (typeof fixture !== "string" || !rule.fixtures.includes(fixture))) error(context.errors, "invalid-fixture", `${path}.fixture`, `${value.component} has no deterministic fixture named ${String(fixture)}`);
  if (!Array.isArray(value.children)) {
    error(context.errors, "invalid-node", `${path}.children`, "Component children must be an array");
    return undefined;
  }
  if (!rule.acceptsChildren && value.children.length > 0) error(context.errors, "invalid-parent", `${path}.children`, `${value.component} does not accept child nodes`);
  const children: ComposerComponentNode[] = [];
  for (let index = 0; index < value.children.length; index++) {
    const child = readNode(value.children[index], region, `${path}.children[${index}]`, context, rule.acceptsChildren);
    if (child?.type === "component") children.push(child);
    else if (child?.type === "placement") error(context.errors, "invalid-parent", `${path}.children[${index}]`, "Placement nodes cannot be nested in components");
  }
  if (!props) return undefined;
  return Object.freeze({ type: "component", id: value.id, component: value.component, props, ...(typeof fixture === "string" && rule.fixtures.includes(fixture) ? { fixture } : {}), children: Object.freeze(children) });
}

function readNode(value: unknown, region: ComposerRegionId, path: string, context: ValidationContext, parentAcceptsChildren = true): ComposerNode | undefined {
  if (!isRecord(value) || (value.type !== "placement" && value.type !== "component")) {
    error(context.errors, "invalid-node", path, "Nodes must be placement or component records");
    return undefined;
  }
  if (typeof value.id === "string" && value.id.trim()) {
    if (context.ids.has(value.id)) error(context.errors, "duplicate-node", `${path}.id`, `Node ID ${value.id} appears more than once`);
    context.ids.add(value.id);
  }
  return value.type === "placement" ? readPlacement(value, region, path, context) : readComponent(value, region, path, context, parentAcceptsChildren);
}

function readAppearance(value: unknown, errors: ComposerValidationError[]): AdminAppearance | undefined {
  if (!isRecord(value)) {
    error(errors, "invalid-document", "$.appearance", "Appearance must be an object");
    return undefined;
  }
  const appearance: AdminAppearance = {
    ...(isChromeAppearance(value.chrome) ? { chrome: value.chrome } : {}),
    ...(isNavigationAppearance(value.navigation) ? { navigation: value.navigation } : {}),
    ...(isActionAppearance(value.actions) ? { actions: value.actions } : {}),
  };
  try {
    return resolveAdminAppearance(appearance);
  } catch (cause) {
    error(errors, "invalid-document", "$.appearance", cause instanceof Error ? cause.message : "Invalid AdminApp appearance");
    return undefined;
  }
}

function readVersionOne(value: Record<string, unknown>, migratedFrom?: number): ComposerReadResult {
  const errors: ComposerValidationError[] = [];
  if (value.schemaVersion !== composerSchemaVersion) error(errors, "invalid-schema", "$.schemaVersion", `Expected Composer schema ${composerSchemaVersion}`);
  if (typeof value.id !== "string" || !value.id.trim()) error(errors, "invalid-document", "$.id", "Document ID must be nonempty");
  if (typeof value.title !== "string" || !value.title.trim()) error(errors, "invalid-document", "$.title", "Document title must be nonempty");
  if (!isAdminPreset(value.preset)) error(errors, "invalid-document", "$.preset", "Document preset is unsupported");
  const appearance = readAppearance(value.appearance, errors);
  if (!Array.isArray(value.regions)) error(errors, "invalid-document", "$.regions", "Document regions must be an array");
  const regions: ComposerRegion[] = [];
  const regionIds = new Set<ComposerRegionId>();
  const context: ValidationContext = { errors, ids: new Set<string>(), zones: new Set<AdminChromeZone>() };
  if (Array.isArray(value.regions)) {
    for (let index = 0; index < value.regions.length; index++) {
      const candidate = value.regions[index];
      const path = `$.regions[${index}]`;
      if (!isRecord(candidate) || !isRegionId(candidate.id) || !Array.isArray(candidate.nodes)) {
        error(errors, "invalid-region", path, "Regions require a supported ID and node array");
        continue;
      }
      if (regionIds.has(candidate.id)) error(errors, "duplicate-region", `${path}.id`, `Region ${candidate.id} appears more than once`);
      regionIds.add(candidate.id);
      const nodes: ComposerNode[] = [];
      for (let nodeIndex = 0; nodeIndex < candidate.nodes.length; nodeIndex++) {
        const node = readNode(candidate.nodes[nodeIndex], candidate.id, `${path}.nodes[${nodeIndex}]`, context);
        if (node) nodes.push(node);
      }
      regions.push(Object.freeze({ id: candidate.id, nodes: Object.freeze(nodes) }));
    }
  }
  for (const region of composerRegionIds) if (!regionIds.has(region)) error(errors, "missing-region", "$.regions", `Missing required ${region} region`);
  const placements: AdminPlacementOverride[] = [];
  for (const region of regions) for (const node of region.nodes) if (node.type === "placement") placements.push({ zone: node.zone, target: node.target });
  if (isAdminPreset(value.preset)) {
    try { resolveAdminPlacements(value.preset, placements); }
    catch (cause) { error(errors, "invalid-parent", "$.regions", cause instanceof Error ? cause.message : "Invalid AdminApp placements"); }
  }
  if (errors.length > 0 || typeof value.id !== "string" || typeof value.title !== "string" || !isAdminPreset(value.preset) || !appearance) return { ok: false, errors: Object.freeze(errors) };
  const order = new Map(composerRegionIds.map((region, index) => [region, index]));
  regions.sort((first, second) => (order.get(first.id) ?? 0) - (order.get(second.id) ?? 0));
  return {
    ok: true,
    document: Object.freeze({ schemaVersion: composerSchemaVersion, id: value.id, title: value.title, preset: value.preset, appearance, regions: Object.freeze(regions) }),
    ...(migratedFrom === undefined ? {} : { migratedFrom }),
  };
}

function migrateVersionZero(value: Record<string, unknown>): Record<string, unknown> | undefined {
  if (value.schemaVersion !== 0 || !isRecord(value.regions)) return undefined;
  const regions = value.regions;
  return {
    schemaVersion: composerSchemaVersion,
    id: value.id,
    title: value.title,
    preset: value.preset ?? "standard",
    appearance: value.appearance ?? {},
    regions: composerRegionIds.map(id => ({ id, nodes: Array.isArray(regions[id]) ? regions[id] : [] })),
  };
}

export function readComposerDocument(value: unknown): ComposerReadResult {
  if (!isRecord(value)) return { ok: false, errors: [{ code: "invalid-document", path: "$", message: "Composer document must be an object" }] };
  if (value.schemaVersion === composerSchemaVersion) return readVersionOne(value);
  const migrated = migrateVersionZero(value);
  if (migrated) return readVersionOne(migrated, 0);
  return { ok: false, errors: [{ code: "invalid-schema", path: "$.schemaVersion", message: `Unsupported Composer schema ${String(value.schemaVersion)}` }] };
}

export function serializeComposerDocument(document: ComposerDocument): string {
  const result = readComposerDocument(document);
  if (!result.ok) throw new Error(result.errors.map(item => `${item.path}: ${item.message}`).join("\n"));
  return `${JSON.stringify(result.document, null, 2)}\n`;
}

export function composerPlacements(document: ComposerDocument): readonly AdminPlacementOverride[] {
  const result: AdminPlacementOverride[] = [];
  for (const region of document.regions) for (const node of region.nodes) if (node.type === "placement") result.push({ zone: node.zone, target: node.target });
  return Object.freeze(result);
}

export function composerRegion(document: ComposerDocument, id: ComposerRegionId): ComposerRegion {
  const region = document.regions.find(candidate => candidate.id === id);
  if (!region) throw new Error(`Composer document is missing ${id}`);
  return region;
}

function equalProps(first: Readonly<Record<string, ComposerScalar>>, second: Readonly<Record<string, ComposerScalar>>): boolean {
  const firstKeys = Object.keys(first);
  const secondKeys = Object.keys(second);
  return firstKeys.length === secondKeys.length && firstKeys.every(key => Object.is(first[key], second[key]));
}

/** Preserve unchanged node identities when a validated document crosses the iframe boundary. */
export function reconcileComposerDocument(previous: ComposerDocument, incoming: ComposerDocument): ComposerDocument {
  const previousNodes = new Map<string, ComposerNode>();
  const collect = (nodes: readonly ComposerNode[]): void => {
    for (const node of nodes) {
      previousNodes.set(node.id, node);
      if (node.type === "component") collect(node.children);
    }
  };
  for (const region of previous.regions) collect(region.nodes);
  const reconcileNode = (node: ComposerNode): ComposerNode => {
    const old = previousNodes.get(node.id);
    if (node.type === "placement") {
      return old?.type === "placement" && old.zone === node.zone && old.target === node.target ? old : node;
    }
    const children = node.children.map(child => {
      const reconciled = reconcileNode(child);
      if (reconciled.type !== "component") throw new Error("Composer component children cannot contain placement nodes");
      return reconciled;
    });
    if (old?.type === "component" && old.component === node.component && old.fixture === node.fixture && equalProps(old.props, node.props)
      && old.children.length === children.length && old.children.every((child, index) => child === children[index])) return old;
    return Object.freeze({ ...node, children: Object.freeze(children) });
  };
  const regions = incoming.regions.map(region => {
    const nodes = region.nodes.map(reconcileNode);
    const old = previous.regions.find(candidate => candidate.id === region.id);
    return old && old.nodes.length === nodes.length && old.nodes.every((node, index) => node === nodes[index])
      ? old
      : Object.freeze({ id: region.id, nodes: Object.freeze(nodes) });
  });
  const appearanceEqual = previous.appearance.chrome === incoming.appearance.chrome
    && previous.appearance.navigation === incoming.appearance.navigation
    && previous.appearance.actions === incoming.appearance.actions;
  if (previous.schemaVersion === incoming.schemaVersion && previous.id === incoming.id && previous.title === incoming.title
    && previous.preset === incoming.preset && appearanceEqual && previous.regions.every((region, index) => region === regions[index])) return previous;
  return Object.freeze({ ...incoming, regions: Object.freeze(regions) });
}
