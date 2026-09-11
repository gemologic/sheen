/** Build-time documentation data. Never imported by the component runtime entry point. */
export interface PropMetadata {
  readonly description: string;
  readonly default?: string | number | boolean | null;
  readonly control?: { readonly kind: "boolean" | "text" } | { readonly kind: "select"; readonly values: readonly (string | number | boolean | null)[] };
}

export type ComposerMetadataParentRegion = "root" | "topbar" | "sidebar" | "page-header" | "toolbar" | "main-grid" | "details-panel" | "status-bar" | "overlays";

export interface ComposerMetadata {
  readonly allowedParentRegions: readonly ComposerMetadataParentRegion[];
  readonly acceptedChildRegions: readonly string[];
  readonly editableSafeProps: readonly string[];
  readonly fixtureFactory: string;
  readonly codeGenerationAdapter: string;
}

const composerMetadataParentRegions: readonly ComposerMetadataParentRegion[] = ["root", "topbar", "sidebar", "page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"];

function composerParentRegions(value: unknown): value is ComposerMetadataParentRegion[] {
  return strings(value) && value.every(candidate => composerMetadataParentRegions.some(region => region === candidate));
}

export interface ComponentMetadata {
  readonly name: string;
  readonly package: string;
  readonly category: string;
  readonly summary: string;
  readonly props: Readonly<Record<string, PropMetadata>>;
  readonly tokens: readonly string[];
  readonly a11y: { readonly role: string; readonly keyboard: readonly string[] };
  readonly examples: readonly { readonly title: string; readonly code: string; readonly imports?: string; readonly setup?: string }[];
  readonly guidance: { readonly do: readonly string[]; readonly dont: readonly string[] };
  readonly composer?: ComposerMetadata;
}

export function defineMeta<Props>(metadata: Omit<ComponentMetadata, "props"> & { readonly props: Partial<Record<keyof Props, PropMetadata>> }): ComponentMetadata {
  if (!isComponentMetadata(metadata)) throw new Error("Invalid component metadata");
  return Object.freeze(metadata);
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(text); }
function scalar(value: unknown): boolean { return value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)); }

export function isComponentMetadata(value: unknown): value is ComponentMetadata {
  if (!record(value) || !text(value.name) || !text(value.package) || !text(value.category) || !text(value.summary) || !record(value.props)) return false;
  for (const prop of Object.values(value.props)) {
    if (!record(prop) || !text(prop.description) || ("default" in prop && !scalar(prop.default))) return false;
    if (prop.control !== undefined) {
      if (!record(prop.control)) return false;
      if (prop.control.kind === "select") {
        if (!Array.isArray(prop.control.values) || !prop.control.values.length || !prop.control.values.every(scalar)) return false;
      } else if (prop.control.kind !== "text" && prop.control.kind !== "boolean") return false;
    }
  }
  const composer = value.composer;
  const validComposer = composer === undefined || (record(composer)
    && composerParentRegions(composer.allowedParentRegions) && composer.allowedParentRegions.length > 0
    && strings(composer.acceptedChildRegions) && strings(composer.editableSafeProps)
    && text(composer.fixtureFactory) && text(composer.codeGenerationAdapter));
  return validComposer && strings(value.tokens) && record(value.a11y) && text(value.a11y.role) && strings(value.a11y.keyboard)
    && Array.isArray(value.examples) && value.examples.length > 0 && value.examples.every(example => record(example) && text(example.title) && text(example.code) && (example.imports === undefined || typeof example.imports === "string") && (example.setup === undefined || typeof example.setup === "string"))
    && record(value.guidance) && strings(value.guidance.do) && strings(value.guidance.dont);
}
