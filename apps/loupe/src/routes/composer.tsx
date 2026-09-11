import { Button, Card, Heading, Input, NumberField, Select, Stack, Switch, Text, Textarea, useTheme } from "@gemologic/sheen";
import type { SelectOption, ThemeState } from "@gemologic/sheen";
import { CodeBlock } from "@gemologic/sheen-code";
import { accentNames, bundledThemeMetadata, isAccentName } from "@gemologic/sheen-tokens";
import { adminChromeZones, adminPlacementTargets } from "@gemologic/sheen-patterns/admin-config";
import type { AdminActionAppearance, AdminChromeAppearance, AdminChromeTarget, AdminChromeZone, AdminNavigationAppearance, AdminPreset } from "@gemologic/sheen-patterns/admin-config";
import { For, Show, Suspense, createEffect, createMemo, createSignal, lazy, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { composerAllowedRegions, composerCatalog, composerCatalogEntry, createComposerNode } from "../composer/catalog.ts";
import type { ComposerPropEditor } from "../composer/catalog.ts";
import {
  addComposerNode,
  commitComposerHistory,
  configureComposerNode,
  createComposerHistory,
  duplicateComposerNode,
  findComposerNode,
  moveComposerNode,
  readComposerDraft,
  redoComposerHistory,
  removeComposerDraft,
  removeComposerNode,
  setComposerAppearance,
  setComposerPlacement,
  setComposerPreset,
  undoComposerHistory,
  writeComposerDraft,
} from "../composer/editor.ts";
import type { ComposerDestination, ComposerDraftStorage, ComposerHistory, ComposerNodeLocation } from "../composer/editor.ts";
import { createComposerFixtures, defaultComposerDocument } from "../composer/fixtures.ts";
import { generateComposerTsx } from "../composer/generator.ts";
import type { ComposerGenerationMode } from "../composer/generator.ts";
import { composerRegion, composerRegionIds, readComposerDocument, serializeComposerDocument } from "../composer/model.ts";
import type { ComposerComponentName, ComposerComponentNode, ComposerDocument, ComposerRegionId, ComposerScalar } from "../composer/model.ts";
import { readComposerPreviewMessage } from "../composer/protocol.ts";
import type { ComposerPreviewState, ComposerStateMessage } from "../composer/protocol.ts";

const ComposerPalette = lazy(() => import("../composer/ComposerPalette.tsx"));
const draftKey = "sheen-loupe-composer-v1";
const fixtures = createComposerFixtures("northstar-v1");

const presetOptions: readonly SelectOption[] = [
  { value: "standard", label: "Standard" },
  { value: "workspace", label: "Workspace" },
  { value: "horizontal", label: "Horizontal" },
  { value: "inspector", label: "Inspector" },
];
const chromeOptions: readonly SelectOption[] = [{ value: "layered", label: "Layered" }, { value: "unified", label: "Unified" }, { value: "tonal", label: "Tonal" }];
const navigationOptions: readonly SelectOption[] = [{ value: "subtle", label: "Subtle" }, { value: "accent", label: "Accent" }, { value: "indicator", label: "Indicator" }];
const actionOptions: readonly SelectOption[] = [{ value: "quiet", label: "Quiet" }, { value: "outlined", label: "Outlined" }, { value: "accent", label: "Accent" }];
const modeOptions: readonly SelectOption[] = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];
const densityOptions: readonly SelectOption[] = [{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }];
const radiusOptions: readonly SelectOption[] = [{ value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }];
const motionOptions: readonly SelectOption[] = [{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }];
const directionOptions: readonly SelectOption[] = [{ value: "ltr", label: "Left to right" }, { value: "rtl", label: "Right to left" }];
const localeOptions: readonly SelectOption[] = [{ value: "en-US", label: "English (US)" }, { value: "de-DE", label: "Deutsch" }, { value: "ar-EG", label: "العربية" }, { value: "ja-JP", label: "日本語" }];
const viewportOptions: readonly SelectOption[] = [{ value: "1440x900", label: "Desktop, 1440 × 900" }, { value: "1024x768", label: "Tablet, 1024 × 768" }, { value: "768x900", label: "Narrow tablet, 768 × 900" }, { value: "390x844", label: "Phone, 390 × 844" }];
const generationOptions: readonly SelectOption[] = [{ value: "self-contained", label: "Self-contained app" }, { value: "structure-only", label: "Structure with named slots" }];

const regionLabels: Readonly<Record<ComposerRegionId, string>> = Object.freeze({
  topbar: "Topbar placements",
  sidebar: "Sidebar placements",
  "page-header": "Page header",
  toolbar: "Toolbar",
  "main-grid": "Main grid",
  "details-panel": "Details panel",
  "status-bar": "Status bar",
  overlays: "Overlays",
});

const targetLabels: Readonly<Record<AdminChromeTarget, string>> = Object.freeze({
  "topbar-start": "Topbar start",
  "topbar-center": "Topbar center",
  "topbar-end": "Topbar end",
  "sidebar-header": "Left sidebar top",
  "sidebar-navigation": "Left sidebar navigation",
  "sidebar-footer": "Left sidebar bottom",
});

const zoneLabels: Readonly<Record<AdminChromeZone, string>> = Object.freeze({
  product: "Product",
  workspace: "Workspace",
  "primary-navigation": "Primary navigation",
  "secondary-navigation": "Secondary navigation",
  "current-view": "Current view",
  "command-trigger": "Command trigger",
  "global-search": "Global search",
  "primary-actions": "Primary actions",
  "utility-actions": "Utility actions",
  notifications: "Notifications",
  help: "Help",
  account: "Account menu",
});

function preset(value: string | null): AdminPreset | undefined {
  return value === "standard" || value === "workspace" || value === "horizontal" || value === "inspector" ? value : undefined;
}

function chrome(value: string | null): AdminChromeAppearance | undefined {
  return value === "layered" || value === "unified" || value === "tonal" ? value : undefined;
}

function navigation(value: string | null): AdminNavigationAppearance | undefined {
  return value === "subtle" || value === "accent" || value === "indicator" ? value : undefined;
}

function actions(value: string | null): AdminActionAppearance | undefined {
  return value === "quiet" || value === "outlined" || value === "accent" ? value : undefined;
}

function mode(value: string | null): ThemeState["mode"] | undefined {
  return value === "dark" || value === "light" || value === "system" ? value : undefined;
}

function density(value: string | null): ThemeState["density"] | undefined {
  return value === "compact" || value === "comfortable" || value === "spacious" ? value : undefined;
}

function radius(value: string | null): ThemeState["radius"] | undefined {
  return value === "sharp" || value === "soft" || value === "round" ? value : undefined;
}

function motion(value: string | null): ThemeState["motion"] | undefined {
  return value === "full" || value === "reduced" ? value : undefined;
}

function direction(value: string | null): ThemeState["direction"] | undefined {
  return value === "ltr" || value === "rtl" ? value : undefined;
}

function generationMode(value: string | null): ComposerGenerationMode | undefined {
  return value === "self-contained" || value === "structure-only" ? value : undefined;
}

function regionId(value: string | null): ComposerRegionId | undefined {
  if (value === null) return undefined;
  return composerRegionIds.find(candidate => candidate === value);
}

function componentName(value: string | null): ComposerComponentName | undefined {
  if (value === null) return undefined;
  return composerCatalog.find(entry => entry.component === value)?.component;
}

function browserStorage(): ComposerDraftStorage {
  return {
    get: key => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
    remove: key => window.localStorage.removeItem(key),
  };
}

function nextNodeId(document: ComposerDocument, component: ComposerComponentName): string {
  const stem = component.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLocaleLowerCase("en-US");
  for (let index = 1; index < 10_000; index++) {
    const id = `${stem}-${index}`;
    if (!findComposerNode(document, id)) return id;
  }
  throw new Error(`Could not allocate a Composer node ID for ${component}`);
}

function destinationFor(document: ComposerDocument, component: ComposerComponentName, selected: ComposerNodeLocation | undefined, relation: "before" | "after" | "end"): ComposerDestination {
  const allowed = composerAllowedRegions(component);
  if (selected?.node.type === "component" && allowed.includes(selected.region)) {
    return { region: selected.region, ...(selected.parentId === undefined ? {} : { parentId: selected.parentId }), index: selected.index + (relation === "after" ? 1 : 0) };
  }
  const region = allowed[0];
  if (!region) throw new Error(`${component} has no Composer destination`);
  return { region, index: relation === "end" ? composerRegion(document, region).nodes.length : 0 };
}

function target(value: string | null, zone: AdminChromeZone): AdminChromeTarget | undefined {
  if (value === null) return undefined;
  return adminPlacementTargets[zone].find(candidate => candidate === value);
}

interface PropControlProps {
  readonly node: ComposerComponentNode;
  readonly editor: ComposerPropEditor;
  readonly onChange: (name: string, value: ComposerScalar) => void;
}

function PropControl(props: PropControlProps): JSX.Element {
  const value = () => props.node.props[props.editor.name];
  if (props.editor.kind === "boolean") {
    return <Switch label={props.editor.label} checked={value() === true} onCheckedChange={next => props.onChange(props.editor.name, next)} />;
  }
  if (props.editor.kind === "select") {
    const options = () => (props.editor.choices ?? []).map(choice => ({ value: String(choice.value), label: choice.label }));
    return <Select label={props.editor.label} value={String(value() ?? "")} options={options()} onValueChange={next => {
      const choice = props.editor.choices?.find(candidate => String(candidate.value) === next);
      if (choice) props.onChange(props.editor.name, choice.value);
    }} />;
  }
  if (props.editor.kind === "number") {
    const numericValue = () => {
      const current = value();
      return typeof current === "number" ? current : null;
    };
    return <NumberField label={props.editor.label} value={numericValue()} onValueChange={next => {
      if (next !== null) props.onChange(props.editor.name, next);
    }} />;
  }
  const textValue = () => {
    const current = value();
    return typeof current === "string" ? current : "";
  };
  return <Input label={props.editor.label} value={textValue()} onChange={event => props.onChange(props.editor.name, event.currentTarget.value)} />;
}

export default function ComposerRoute(): JSX.Element {
  const rootTheme = useTheme();
  const [history, setHistory] = createSignal<ComposerHistory>(createComposerHistory(defaultComposerDocument));
  const [selectedId, setSelectedId] = createSignal<string>();
  const [insertComponent, setInsertComponent] = createSignal<ComposerComponentName>("Card");
  const [previewTheme, setPreviewTheme] = createSignal<ThemeState>({ ...rootTheme.state(), density: "compact" });
  const [viewport, setViewport] = createSignal("1440x900");
  const [width, setWidth] = createSignal<number | null>(1440);
  const [height, setHeight] = createSignal<number | null>(900);
  const [codeMode, setCodeMode] = createSignal<ComposerGenerationMode>("self-contained");
  const [jsonSource, setJsonSource] = createSignal(serializeComposerDocument(defaultComposerDocument));
  const [status, setStatus] = createSignal("Starter ready. Select a block or add a component.");
  const [recovered, setRecovered] = createSignal<ComposerDocument>();
  const [draftWritable, setDraftWritable] = createSignal(false);
  const [themeEdited, setThemeEdited] = createSignal(false);
  const [dragActive, setDragActive] = createSignal(false);
  const [dragReady, setDragReady] = createSignal(false);
  const [focusId, setFocusId] = createSignal<string>();
  const document = () => history().present;
  const selected = createMemo(() => {
    const id = selectedId();
    return id ? findComposerNode(document(), id) : undefined;
  });
  const generated = createMemo(() => generateComposerTsx(document(), fixtures, codeMode()));
  let frame: HTMLIFrameElement | undefined;
  let paletteRoot: HTMLDivElement | undefined;
  let dropTargets: HTMLDivElement | undefined;
  let revision = 0;
  let cleanupDrag: (() => void) | undefined;

  const announce = (message: string): void => { setStatus(message); };
  const sendPreview = (): void => {
    const targetWindow = frame?.contentWindow;
    if (!targetWindow) return;
    const selectedNodeId = selectedId();
    const requestedFocusId = focusId();
    const state: ComposerPreviewState = {
      document: document(),
      theme: previewTheme(),
      ...(selectedNodeId === undefined ? {} : { selectedId: selectedNodeId }),
      ...(requestedFocusId === undefined ? {} : { focusId: requestedFocusId }),
      revision: ++revision,
    };
    const message: ComposerStateMessage = { kind: "sheen-composer-state", state };
    targetWindow.postMessage(message, window.location.origin);
    if (focusId() !== undefined) queueMicrotask(() => setFocusId(undefined));
  };

  createEffect(() => {
    void document();
    void previewTheme();
    void selectedId();
    void focusId();
    sendPreview();
  });
  createEffect(() => {
    const root = rootTheme.state();
    if (!themeEdited()) setPreviewTheme({ ...root, density: "compact" });
  });
  createEffect(() => {
    const current = document();
    if (!draftWritable()) return;
    const result = writeComposerDraft(browserStorage(), draftKey, current);
    if (!result.ok) {
      setDraftWritable(false);
      announce(`Draft storage unavailable: ${result.message}`);
    }
  });

  const commit = (next: ComposerDocument, message: string, nextSelected?: string): void => {
    if (recovered() !== undefined) {
      setRecovered(undefined);
      setDraftWritable(true);
    }
    setHistory(current => commitComposerHistory(current, next));
    if (nextSelected !== undefined) {
      setSelectedId(nextSelected);
      setFocusId(nextSelected);
    }
    announce(message);
  };
  const safely = (operation: () => void): void => {
    try { operation(); }
    catch (error) { announce(error instanceof Error ? error.message : String(error)); }
  };
  const add = (component: ComposerComponentName, relation: "before" | "after" | "end" = "end", explicitRegion?: ComposerRegionId): void => safely(() => {
    const id = nextNodeId(document(), component);
    const node = createComposerNode(component, id);
    const destination = explicitRegion === undefined
      ? destinationFor(document(), component, selected(), relation)
      : { region: explicitRegion, index: composerRegion(document(), explicitRegion).nodes.length };
    commit(addComposerNode(document(), destination, node), `${component} added to ${regionLabels[destination.region]}.`, id);
  });
  const moveRelative = (offset: -1 | 1): void => safely(() => {
    const location = selected();
    const id = selectedId();
    if (!location || !id || location.node.type !== "component") throw new Error("Select a component block first");
    const destination = { region: location.region, ...(location.parentId === undefined ? {} : { parentId: location.parentId }), index: location.index + (offset < 0 ? -1 : 2) };
    commit(moveComposerNode(document(), id, destination), `${location.node.component} moved ${offset < 0 ? "up" : "down"}.`, id);
  });
  const updateTheme = (next: Partial<ThemeState>): void => {
    setThemeEdited(true);
    setPreviewTheme(current => ({ ...current, ...next }));
  };
  const updateViewport = (value: string): void => {
    const dimensions = value.split("x").map(part => Number(part));
    const nextWidth = dimensions[0];
    const nextHeight = dimensions[1];
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;
    setViewport(value);
    setWidth(nextWidth ?? null);
    setHeight(nextHeight ?? null);
  };
  const undo = (): void => {
    const next = undoComposerHistory(history());
    if (next === history()) return;
    setHistory(next);
    if (selectedId() && !findComposerNode(next.present, selectedId() ?? "")) setSelectedId(undefined);
    announce("Undid the last document edit.");
  };
  const redo = (): void => {
    const next = redoComposerHistory(history());
    if (next === history()) return;
    setHistory(next);
    announce("Redid the document edit.");
  };
  const importJson = (): void => safely(() => {
    let parsed: unknown;
    try { parsed = JSON.parse(jsonSource()); }
    catch (error) { throw new Error(error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON"); }
    const result = readComposerDocument(parsed);
    if (!result.ok) throw new Error(result.errors.map(item => `${item.path}: ${item.message}`).join("\n"));
    setHistory(createComposerHistory(result.document));
    setSelectedId(undefined);
    setDraftWritable(true);
    setJsonSource(serializeComposerDocument(result.document));
    announce(result.migratedFrom === undefined ? "Imported Composer document." : `Imported and migrated Composer schema ${result.migratedFrom}.`);
  });
  const exportJson = (): void => {
    const source = serializeComposerDocument(document());
    setJsonSource(source);
    const url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document().id}.composer.json`;
    link.click();
    URL.revokeObjectURL(url);
    announce("Exported the private Composer document.");
  };
  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(generated());
      announce(`Copied ${codeMode()} TSX.`);
    } catch (error) {
      announce(error instanceof Error ? `Could not copy TSX: ${error.message}` : "Could not copy TSX");
    }
  };
  const reset = (): void => {
    const result = removeComposerDraft(browserStorage(), draftKey);
    setHistory(createComposerHistory(defaultComposerDocument));
    setSelectedId(undefined);
    setRecovered(undefined);
    setDraftWritable(result.ok);
    setJsonSource(serializeComposerDocument(defaultComposerDocument));
    announce(result.ok ? "Reset to the polished starter and cleared its local draft." : `Reset the document, but could not clear storage: ${result.message}`);
  };

  onMount(() => {
    const saved = readComposerDraft(browserStorage(), draftKey);
    if (saved.kind === "empty") {
      setDraftWritable(true);
      announce("Starter ready. Local draft saving is active.");
    } else if (saved.kind === "ready") {
      setRecovered(saved.document);
      announce(saved.migratedFrom === undefined ? "A local draft is available to restore." : `A schema ${saved.migratedFrom} draft is available to migrate and restore.`);
    } else {
      announce(`Local draft ${saved.kind}: ${saved.message}`);
    }
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.origin !== window.location.origin || event.source !== frame?.contentWindow) return;
      const message = readComposerPreviewMessage(event.data);
      if (!message) return;
      if (message.kind === "sheen-composer-ready") sendPreview();
      else if (message.kind === "sheen-composer-select") setSelectedId(message.id);
      else safely(() => commit(moveComposerNode(document(), message.sourceId, message.destination), "Moved block with pointer drag.", message.sourceId));
    };
    window.addEventListener("message", receive);
    void import("../composer/drag.ts").then(module => {
      if (!paletteRoot || !dropTargets) return undefined;
      return module.bindComposerPaletteDrag(paletteRoot, dropTargets, (component, region) => add(component, "end", region), setDragActive);
    }).then(cleanup => { cleanupDrag?.(); cleanupDrag = cleanup; setDragReady(cleanup !== undefined); });
    onCleanup(() => { setDragReady(false); cleanupDrag?.(); window.removeEventListener("message", receive); });
  });

  const selectedComponent = createMemo(() => {
    const location = selected();
    return location?.node.type === "component" ? location.node : undefined;
  });
  const selectedCatalog = createMemo(() => {
    const node = selectedComponent();
    return node ? composerCatalogEntry(node.component) : undefined;
  });
  const regionMoveOptions = createMemo<readonly SelectOption[]>(() => {
    const node = selectedComponent();
    return node ? composerAllowedRegions(node.component).map(value => ({ value, label: regionLabels[value] })) : [];
  });
  const selectedSiblingCount = createMemo(() => {
    const location = selected();
    if (!location) return 0;
    if (location.parentId === undefined) return composerRegion(document(), location.region).nodes.length;
    const parent = findComposerNode(document(), location.parentId)?.node;
    return parent?.type === "component" ? parent.children.length : 0;
  });
  const contentRegions: readonly ComposerRegionId[] = ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"];

  return <main class="loupe-composer-page">
    <header class="loupe-composer-heading">
      <div><Heading level={1}>Application Composer</Heading><Text tone="muted">Start from the compact AdminApp baseline, then move branded chrome and compose real Sheen components. Output is copyable TSX, not a runtime page schema.</Text></div>
      <div class="loupe-composer-heading-actions">
        <Button size="sm" variant="outline" onClick={undo} disabled={history().past.length === 0}>Undo</Button>
        <Button size="sm" variant="outline" onClick={redo} disabled={history().future.length === 0}>Redo</Button>
        <Button size="sm" variant="outline" tone="danger" onClick={reset}>Reset starter</Button>
      </div>
    </header>
    <div class="loupe-composer-status" role="status" aria-live="polite">{status()}</div>
    <Show when={recovered()}>{draft => <section class="loupe-composer-recovery" aria-label="Recovered draft">
      <Text>A local draft is available. The server-rendered starter stays in place until you choose to restore it.</Text>
      <Button size="sm" variant="outline" onClick={() => {
        setHistory(createComposerHistory(draft()));
        setJsonSource(serializeComposerDocument(draft()));
        setRecovered(undefined);
        setDraftWritable(true);
        announce("Restored the local Composer draft.");
      }}>Restore draft</Button>
      <Button size="sm" variant="outline" onClick={() => {
        const result = removeComposerDraft(browserStorage(), draftKey);
        if (result.ok) { setRecovered(undefined); setDraftWritable(true); announce("Discarded the recovered draft."); }
        else announce(`Could not discard the draft: ${result.message}`);
      }}>Discard draft</Button>
    </section>}</Show>

    <section class="loupe-composer-axis-bar" aria-label="Preview and AdminApp configuration">
      <Select label="AdminApp preset" value={document().preset} options={presetOptions} onValueChange={value => {
        const next = preset(value);
        if (next) safely(() => commit(setComposerPreset(document(), next), `Applied the ${next} AdminApp preset.`));
      }} />
      <Select label="Chrome" value={document().appearance.chrome ?? "layered"} options={chromeOptions} onValueChange={value => {
        const next = chrome(value);
        if (next) safely(() => commit(setComposerAppearance(document(), { ...document().appearance, chrome: next }), `Chrome appearance changed to ${next}.`));
      }} />
      <Select label="Navigation" value={document().appearance.navigation ?? "subtle"} options={navigationOptions} onValueChange={value => {
        const next = navigation(value);
        if (next) safely(() => commit(setComposerAppearance(document(), { ...document().appearance, navigation: next }), `Navigation appearance changed to ${next}.`));
      }} />
      <Select label="Actions" value={document().appearance.actions ?? "quiet"} options={actionOptions} onValueChange={value => {
        const next = actions(value);
        if (next) safely(() => commit(setComposerAppearance(document(), { ...document().appearance, actions: next }), `Action appearance changed to ${next}.`));
      }} />
      <Select label="Theme" value={previewTheme().theme} options={bundledThemeMetadata.map(item => ({ value: item.id, label: item.label }))} onValueChange={value => {
        if (value && bundledThemeMetadata.some(item => item.id === value)) updateTheme({ theme: value });
      }} />
      <Select label="Accent" value={previewTheme().accent} options={accentNames.map(value => ({ value, label: value[0]?.toUpperCase() + value.slice(1) }))} onValueChange={value => {
        if (value && isAccentName(value)) updateTheme({ accent: value });
      }} />
      <Select label="Mode" value={previewTheme().mode} options={modeOptions} onValueChange={value => { const next = mode(value); if (next) updateTheme({ mode: next }); }} />
      <Select label="Density" value={previewTheme().density} options={densityOptions} onValueChange={value => { const next = density(value); if (next) updateTheme({ density: next }); }} />
      <Select label="Radius" value={previewTheme().radius} options={radiusOptions} onValueChange={value => { const next = radius(value); if (next) updateTheme({ radius: next }); }} />
      <Select label="Motion" value={previewTheme().motion} options={motionOptions} onValueChange={value => { const next = motion(value); if (next) updateTheme({ motion: next }); }} />
      <Select label="Direction" value={previewTheme().direction} options={directionOptions} onValueChange={value => { const next = direction(value); if (next) updateTheme({ direction: next }); }} />
      <Select label="Locale" value={previewTheme().locale} options={localeOptions} onValueChange={value => { if (value) updateTheme({ locale: value }); }} />
      <Select label="Viewport" value={viewport()} options={viewportOptions} onValueChange={value => { if (value) updateViewport(value); }} />
    </section>

    <details class="loupe-composer-placements">
      <summary>Place navigation, account, and app chrome</summary>
      <div class="loupe-composer-placement-grid">
        <For each={adminChromeZones}>{zone => {
          const location = () => findComposerNode(document(), `placement-${zone}`);
          const placementValue = () => {
            const current = location()?.node;
            return current?.type === "placement" ? current.target : null;
          };
          return <Select label={`${zoneLabels[zone]} placement`} value={placementValue()}
            options={adminPlacementTargets[zone].map(value => ({ value, label: targetLabels[value] }))} onValueChange={value => {
              const next = target(value, zone);
              if (next) safely(() => commit(setComposerPlacement(document(), zone, next), `${zoneLabels[zone]} moved to ${targetLabels[next]}.`));
            }} />;
        }}</For>
      </div>
    </details>

    <div class="loupe-composer-workspace">
      <div ref={paletteRoot} class="loupe-composer-palette-column" data-drag-ready={dragReady() || undefined}>
        <Suspense fallback={<Card><Text>Loading component palette…</Text></Card>}><ComposerPalette onChoose={component => add(component)} /></Suspense>
      </div>

      <section class="loupe-composer-canvas-column" aria-labelledby="composer-canvas-heading">
        <div class="loupe-composer-canvas-heading">
          <div><Heading id="composer-canvas-heading" level={2} size="h4">Preview canvas</Heading><Text size="caption" tone="muted">Resize the frame, use the viewport presets, or drag a palette item to a semantic region.</Text></div>
          <div class="loupe-composer-dimensions">
            <NumberField label="Width" value={width()} min={320} max={1600} onValueChange={setWidth} />
            <NumberField label="Height" value={height()} min={480} max={1200} onValueChange={setHeight} />
          </div>
        </div>
        <div class="loupe-composer-canvas-scroll" role="region" aria-label="Scrollable preview canvas" tabIndex={0}>
          <div class="loupe-composer-viewport" style={`--loupe-composer-width:${width() ?? 1440}px;--loupe-composer-height:${height() ?? 900}px`}>
            <iframe ref={frame} title="Editable AdminApp preview" src="/composer-preview" onLoad={sendPreview} />
            <div ref={dropTargets} class="loupe-composer-drop-targets" data-active={dragActive() || undefined} aria-hidden="true">
              <For each={contentRegions}>{region => <div data-composer-drop-region={region}><span>{regionLabels[region]}</span></div>}</For>
            </div>
          </div>
        </div>
      </section>

      <aside class="loupe-composer-inspector" aria-labelledby="composer-inspector-heading">
        <Stack gap="md">
          <Heading id="composer-inspector-heading" level={2} size="h4">Inspector</Heading>
          <Show when={selectedComponent()} fallback={<Text tone="muted">Select a block in the preview. Every pointer operation also appears here as a keyboard-operable action.</Text>}>
            {node => <>
              <div><strong>{node().component}</strong><Text size="caption" tone="muted">{node().id} in {regionLabels[selected()?.region ?? "main-grid"]}</Text></div>
              <div class="loupe-composer-node-actions">
                <Button size="sm" onClick={() => moveRelative(-1)} disabled={(selected()?.index ?? 0) === 0}>Move up</Button>
                <Button size="sm" onClick={() => moveRelative(1)} disabled={(selected()?.index ?? 0) >= selectedSiblingCount() - 1}>Move down</Button>
                <Button size="sm" onClick={() => safely(() => {
                  const id = selectedId();
                  if (!id) throw new Error("Select a component block first");
                  const before = new Set<string>();
                  const collect = (nodes: readonly ComposerComponentNode[]): void => {
                    for (const item of nodes) { before.add(item.id); collect(item.children); }
                  };
                  for (const region of document().regions) collect(region.nodes.filter(item => item.type === "component"));
                  const next = duplicateComposerNode(document(), id);
                  let duplicate: string | undefined;
                  const findNew = (nodes: readonly ComposerComponentNode[]): void => {
                    for (const item of nodes) {
                      if (!before.has(item.id)) { duplicate = item.id; return; }
                      findNew(item.children);
                      if (duplicate) return;
                    }
                  };
                  for (const region of next.regions) {
                    findNew(region.nodes.filter(item => item.type === "component"));
                    if (duplicate) break;
                  }
                  commit(next, `Duplicated ${node().component}.`, duplicate ?? id);
                })}>Duplicate</Button>
                <Button size="sm" tone="danger" onClick={() => safely(() => {
                  const id = selectedId();
                  if (!id) throw new Error("Select a component block first");
                  commit(removeComposerNode(document(), id), `Removed ${node().component}.`);
                  setSelectedId(undefined);
                })}>Remove</Button>
              </div>
              <Select label="Move to region" value={selected()?.region ?? null} options={regionMoveOptions()} onValueChange={value => {
                const next = regionId(value);
                const id = selectedId();
                if (next && id) safely(() => commit(moveComposerNode(document(), id, { region: next, index: composerRegion(document(), next).nodes.length }), `${node().component} moved to ${regionLabels[next]}.`, id));
              }} />
              <Heading level={3} size="h4">Configure {node().component}</Heading>
              <For each={selectedCatalog()?.editors ?? []}>{editor => <PropControl node={node()} editor={editor} onChange={(name, value) => safely(() => {
                commit(configureComposerNode(document(), node().id, { [name]: value }), `${node().component} ${editor.label.toLocaleLowerCase("en-US")} updated.`);
              })} />}</For>
            </>}
          </Show>
          <Heading level={3} size="h4">Insert relative to selection</Heading>
          <Select label="Component to insert" value={insertComponent()} options={composerCatalog.map(entry => ({ value: entry.component, label: entry.label }))} onValueChange={value => {
            const next = componentName(value);
            if (next) setInsertComponent(next);
          }} />
          <div class="loupe-composer-node-actions">
            <Button size="sm" onClick={() => add(insertComponent(), "before")}>Add before</Button>
            <Button size="sm" onClick={() => add(insertComponent(), "after")}>Add after</Button>
          </div>
        </Stack>
      </aside>
    </div>

    <section class="loupe-composer-output" aria-labelledby="composer-output-heading">
      <div class="loupe-composer-output-heading">
        <div><Heading id="composer-output-heading" level={2}>Copyable output</Heading><Text tone="muted">The JSON schema is private and unstable. Generated TSX uses public Sheen imports and deterministic fixtures.</Text></div>
        <Select label="TSX output" value={codeMode()} options={generationOptions} onValueChange={value => { const next = generationMode(value); if (next) setCodeMode(next); }} />
        <Button onClick={() => { void copyCode(); }}>Copy TSX</Button>
        <Button onClick={exportJson}>Export JSON</Button>
      </div>
      <CodeBlock code={generated()} language="tsx" filename={`${document().id}.tsx`} label="Generated Composer TSX" lineNumbers copyable />
      <details class="loupe-composer-json"><summary>Import or inspect private Composer JSON</summary>
        <Stack gap="sm">
          <Textarea label="Composer JSON" value={jsonSource()} rows={12} onInput={event => setJsonSource(event.currentTarget.value)} />
          <div><Button onClick={importJson}>Validate and import JSON</Button></div>
        </Stack>
      </details>
    </section>
  </main>;
}
