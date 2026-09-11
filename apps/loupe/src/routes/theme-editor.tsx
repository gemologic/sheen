import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import {
  Badge,
  Button,
  Card,
  Heading,
  Input,
  NumberField,
  Select,
  Slider,
  Stack,
  Text,
  Textarea,
  ThemeScope,
} from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { useThemeTokens } from "@gemologic/sheen-charts";
import { invalidateThemeTokens } from "@gemologic/sheen-charts/loupe";
import { accentNames, isTokenName, semanticDefaults } from "@gemologic/sheen-tokens";
import type { AccentName, Mode, ThemeDefinition, TokenName } from "@gemologic/sheen-tokens";
import {
  auditEditorTheme,
  createDefaultEditorTheme,
  deriveEditorTheme,
  exportThemeModule,
  formatOklchChannels,
  importThemeSource,
  readEditorStorage,
  readOklchChannels,
  updateEditorToken,
  writeEditorStorage,
} from "../theme-editor-state.ts";
import type { OklchChannels } from "../theme-editor-state.ts";

const modes: readonly SelectOption[] = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }];
const tokenNames = Object.keys(semanticDefaults).filter(isTokenName);
const tokenOptions: readonly SelectOption[] = tokenNames.map(value => ({ value, label: value }));
const accentOptions: readonly SelectOption[] = accentNames.map(value => ({ value, label: value }));

function isMode(value: string | null): value is Mode {
  return value === "dark" || value === "light";
}

function isAccent(value: string | null): value is AccentName {
  return value !== null && accentNames.some(accent => accent === value);
}

function isToken(value: string | null): value is TokenName {
  return value !== null && isTokenName(value);
}

function emitDeclarations(tokens: Readonly<Record<string, string>>): string {
  return Object.entries(tokens).map(([name, value]) => `  --sheen-${name}: ${value};`).join("\n");
}

function editorCss(definition: ThemeDefinition): string {
  const audit = auditEditorTheme(definition);
  return (["dark", "light"] satisfies Mode[]).map(mode => {
    const tokens = mode === "dark" ? audit.dark : audit.light;
    return `.loupe-theme-editor-preview[data-sheen-mode="${mode}"] {\n${emitDeclarations(tokens)}\n}`;
  }).join("\n");
}

function CanvasPreview() {
  const tokens = useThemeTokens(["--sheen-chart-1", "--sheen-chart-grid"]);
  let canvas: HTMLCanvasElement | undefined;
  createEffect(() => {
    const color = tokens()["--sheen-chart-1"];
    const grid = tokens()["--sheen-chart-grid"];
    const context = canvas?.getContext("2d");
    if (!context || !color || !grid) return;
    context.clearRect(0, 0, 320, 72);
    context.fillStyle = color;
    context.fillRect(0, 0, 320, 72);
    context.strokeStyle = grid;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, 58);
    context.lineTo(320, 14);
    context.stroke();
    canvas?.setAttribute("data-paint-count", String(Number(canvas.getAttribute("data-paint-count") ?? "0") + 1));
  });
  return <canvas ref={canvas} width="320" height="72" role="img" aria-label="Live chart token preview" />;
}

function Preview(props: { readonly mode: Mode; readonly diagnostics: readonly string[] }) {
  return <ThemeScope theme="obsidian" mode={props.mode} class="loupe-theme-editor-preview">
    <Stack gap="lg">
      <div><Heading level={2}>Retained component preview</Heading><Text tone="muted">Accepted token edits update this scope without replacing component owners or drafts.</Text></div>
      <Input label="Retained preview draft" placeholder="Type before editing a token" />
      <div class="actions"><Button variant="solid" tone="accent">Accent action</Button><Button variant="outline">Structural action</Button><Badge tone={props.diagnostics.length ? "warning" : "success"}>{props.diagnostics.length ? `${props.diagnostics.length} diagnostics` : "Exportable"}</Badge></div>
      <CanvasPreview />
    </Stack>
  </ThemeScope>;
}

function ThemeEditorContent() {
  const [definition, setDefinition] = createSignal<ThemeDefinition>(createDefaultEditorTheme());
  const [mode, setMode] = createSignal<Mode>("dark");
  const [token, setToken] = createSignal<TokenName>("color-bg");
  const [rawValue, setRawValue] = createSignal(definition().dark["color-bg"] ?? "");
  const [editError, setEditError] = createSignal<string>();
  const [operationError, setOperationError] = createSignal<string>();
  const [storageStatus, setStorageStatus] = createSignal("Checking local recovery…");
  const [storageReady, setStorageReady] = createSignal(false);
  const [importSource, setImportSource] = createSignal("");
  const [deriveBackground, setDeriveBackground] = createSignal(definition().dark["color-bg"] ?? "#141419");
  const [deriveAccent, setDeriveAccent] = createSignal<AccentName>("jade");
  const [neutralHue, setNeutralHue] = createSignal<number | null>(265);
  const audit = createMemo(() => auditEditorTheme(definition()));
  const channels = createMemo(() => {
    try { return readOklchChannels(definition()[mode()][token()] ?? ""); }
    catch { return undefined; }
  });
  let style: HTMLStyleElement | undefined;
  let styleFrame: number | undefined;
  let pendingDefinition = definition();
  let previousIdentity = "";
  let previousValue = "";

  const scheduleStyle = (next: ThemeDefinition): void => {
    pendingDefinition = next;
    if (!style || styleFrame !== undefined) return;
    styleFrame = requestAnimationFrame(() => {
      styleFrame = undefined;
      if (!style) return;
      style.textContent = editorCss(pendingDefinition);
      invalidateThemeTokens();
    });
  };

  createEffect(() => {
    const currentDefinition = definition();
    scheduleStyle(currentDefinition);
    if (!storageReady()) return;
    const result = writeEditorStorage(localStorage, currentDefinition);
    setStorageStatus(result.ok ? "Work in progress saved locally" : `Local recovery unavailable: ${result.message ?? "storage rejected the write"}`);
  });

  createEffect(() => {
    const identity = `${mode()}:${token()}`;
    const value = definition()[mode()][token()] ?? "";
    const existingDraft = untrack(rawValue);
    if (identity !== previousIdentity || existingDraft === previousValue) setRawValue(value);
    previousIdentity = identity;
    previousValue = value;
  });

  onMount(() => {
    style = document.createElement("style");
    style.setAttribute("data-loupe-theme-editor", "");
    document.head.append(style);
    const recovered = readEditorStorage(localStorage);
    if (recovered.status === "loaded" && recovered.definition) {
      setDefinition(recovered.definition);
      setStorageStatus("Recovered local work in progress");
    } else if (recovered.status === "empty") setStorageStatus("Local recovery ready");
    else setStorageStatus(`${recovered.status === "unavailable" ? "Local recovery unavailable" : "Stored draft ignored"}: ${recovered.message ?? "unknown error"}`);
    setStorageReady(true);
    scheduleStyle(definition());
  });

  onCleanup(() => {
    if (styleFrame !== undefined) cancelAnimationFrame(styleFrame);
    style?.remove();
  });

  const updateValue = (value: string): void => {
    setRawValue(value);
    try {
      const next = updateEditorToken(definition(), mode(), token(), value);
      setDefinition(next);
      setEditError(undefined);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : String(error));
    }
  };

  const updateChannels = (change: Partial<OklchChannels>): void => {
    const current = channels();
    if (!current) return;
    updateValue(formatOklchChannels({ ...current, ...change }));
  };

  const changeMode = (next: Mode): void => {
    setMode(next);
    setDeriveBackground(definition()[next]["color-bg"] ?? (next === "dark" ? "#141419" : "#fafafa"));
  };

  const derive = (): void => {
    const hue = neutralHue();
    if (hue === null) return;
    try {
      const next = deriveEditorTheme(definition(), { mode: mode(), background: deriveBackground(), accent: deriveAccent(), neutralHue: hue });
      setDefinition(next);
      setOperationError(undefined);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : String(error));
    }
  };

  const importTheme = (): void => {
    try {
      const next = importThemeSource(importSource());
      setDefinition(next);
      changeMode(next.defaultMode);
      setOperationError(undefined);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportTheme = (): void => {
    let url: string | undefined;
    try {
      const source = exportThemeModule(definition());
      url = URL.createObjectURL(new Blob([source], { type: "text/typescript;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${definition().id}.theme.ts`;
      link.click();
      setOperationError(undefined);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : String(error));
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  return <main class="loupe-theme-editor-page">
    <header class="loupe-theme-editor-heading">
      <div><Heading level={1}>Theme editor</Heading><Text tone="muted">Edit resolved semantic tokens in an isolated scope. Invalid contrast stays visible while import and export fail closed.</Text></div>
      <div class="actions"><Button onClick={exportTheme}>Export theme.ts</Button></div>
    </header>
    <output class="loupe-theme-editor-storage" aria-label="Theme editor recovery status">{storageStatus()}</output>
    <div class="loupe-theme-editor-workspace">
      <section class="loupe-theme-editor-controls" aria-label="Theme editor controls">
        <Card><Stack gap="md">
          <Heading level={2} size="h3">Theme identity</Heading>
          <Input label="Theme ID" value={definition().id} onInput={event => setDefinition(current => ({ ...current, id: event.currentTarget.value }))} />
          <Input label="Theme label" value={definition().label} onInput={event => setDefinition(current => ({ ...current, label: event.currentTarget.value }))} />
          <Select label="Editing mode" value={mode()} options={modes} onValueChange={value => { if (isMode(value)) changeMode(value); }} />
        </Stack></Card>
        <Card><Stack gap="md">
          <Heading level={2} size="h3">Derive from base</Heading>
          <Input label={`${mode()} background`} value={deriveBackground()} onInput={event => setDeriveBackground(event.currentTarget.value)} />
          <Select label="Accent preset" value={deriveAccent()} options={accentOptions} onValueChange={value => { if (isAccent(value)) setDeriveAccent(value); }} />
          <NumberField label="Neutral hue" value={neutralHue()} min={0} max={359.999} step={1} onValueChange={setNeutralHue} />
          <Button onClick={derive}>Derive {mode()} mode</Button>
        </Stack></Card>
        <Card><Stack gap="md">
          <Heading level={2} size="h3">Semantic token</Heading>
          <Select label="Token" value={token()} options={tokenOptions} onValueChange={value => { if (isToken(value)) setToken(value); }} />
          <Show when={editError()} fallback={<Input label="Raw CSS value" value={rawValue()} onInput={event => updateValue(event.currentTarget.value)} />}>
            {error => <Input label="Raw CSS value" value={rawValue()} error={error()} onInput={event => updateValue(event.currentTarget.value)} />}
          </Show>
          <Show when={channels()}>{color => <div class="loupe-theme-editor-channels">
            <Slider label="OKLCH lightness" value={color().lightness} min={0} max={100} step={0.1} onValueChange={value => updateChannels({ lightness: value })} />
            <Slider label="OKLCH chroma" value={color().chroma} min={0} max={0.4} step={0.001} onValueChange={value => updateChannels({ chroma: value })} />
            <Slider label="OKLCH hue" value={color().hue} min={0} max={360} step={0.1} onValueChange={value => updateChannels({ hue: value })} />
            <Slider label="Alpha" value={color().alpha} min={0} max={1} step={0.01} onValueChange={value => updateChannels({ alpha: value })} />
          </div>}</Show>
        </Stack></Card>
        <Card><Stack gap="md">
          <Heading level={2} size="h3">Validated import</Heading>
          <Textarea label="Theme JSON or Loupe theme.ts" value={importSource()} rows={8} onInput={event => setImportSource(event.currentTarget.value)} description="Only JSON and Loupe's exact generated module envelope are parsed. Source code is never evaluated." />
          <Button onClick={importTheme}>Import theme</Button>
        </Stack></Card>
      </section>
      <section class="loupe-theme-editor-result" aria-label="Live theme result">
        <Preview mode={mode()} diagnostics={audit().diagnostics} />
        <Card><Stack gap="md">
          <Heading level={2} size="h3">Diagnostics</Heading>
          <Show when={operationError()}>{error => <p class="loupe-theme-editor-error" role="alert">{error()}</p>}</Show>
          <Show when={audit().diagnostics.length} fallback={<p class="loupe-theme-editor-pass">Both modes pass contrast and chart-palette validation.</p>}>
            <ul class="loupe-theme-editor-diagnostics"><For each={audit().diagnostics}>{diagnostic => <li>{diagnostic}</li>}</For></ul>
          </Show>
        </Stack></Card>
      </section>
    </div>
  </main>;
}

export default function ThemeEditor() {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));
  return <Show when={mounted()} fallback={<main class="loupe-theme-editor-loading" aria-busy="true"><Heading level={1}>Theme editor</Heading><Text tone="muted">Loading recoverable editor state…</Text></main>}><ThemeEditorContent /></Show>;
}
