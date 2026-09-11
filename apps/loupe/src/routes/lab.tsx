import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { NumberField, ScrollArea, Select, Stack, Switch, Text, useTheme } from "@gemologic/sheen";
import type { SelectOption, ThemeState } from "@gemologic/sheen";
import { accentNames } from "@gemologic/sheen-tokens";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { parseLabState, serializeLabState } from "../lab-state.ts";
import type { LabState, LabStateMessage } from "../lab-state.ts";

const modes: readonly SelectOption[] = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];
const densities: readonly SelectOption[] = [{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }];
const radii: readonly SelectOption[] = [{ value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }];
const motions: readonly SelectOption[] = [{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }];
const directions: readonly SelectOption[] = [{ value: "ltr", label: "Left to right" }, { value: "rtl", label: "Right to left" }];
const locales: readonly SelectOption[] = [{ value: "en-US", label: "English (US)" }, { value: "de-DE", label: "Deutsch" }, { value: "ar-EG", label: "العربية" }, { value: "ja-JP", label: "日本語" }];
const forceStates: readonly SelectOption[] = [{ value: "none", label: "None" }, { value: "hover", label: "Hover" }, { value: "active", label: "Active" }, { value: "focus", label: "Focus" }, { value: "disabled", label: "Disabled" }];
const colorVisions: readonly SelectOption[] = [{ value: "normal", label: "Normal" }, { value: "protanopia", label: "Protanopia" }, { value: "deuteranopia", label: "Deuteranopia" }, { value: "tritanopia", label: "Tritanopia" }, { value: "achromatopsia", label: "Achromatopsia" }];
const visionBlurs: readonly SelectOption[] = [{ value: "0", label: "None" }, { value: "1.5", label: "Moderate" }, { value: "3", label: "Strong" }];

function member<T extends string>(value: string | null, accepted: readonly T[]): value is T {
  return value !== null && accepted.some(candidate => candidate === value);
}

export default function Laboratory() {
  const router = useSolidRouterAdapter();
  const theme = useTheme();
  const [state, setState] = createSignal(parseLabState(router.location().search));
  const [widthDraft, setWidthDraft] = createSignal<number | null>(state().width);
  const [heightDraft, setHeightDraft] = createSignal<number | null>(state().height);
  let frame: HTMLIFrameElement | undefined;
  let viewport: HTMLDivElement | undefined;
  let resizeFrame: number | undefined;
  const initialSource = `/lab-preview?${serializeLabState(state())}`;

  const send = (next: LabState): void => {
    const message: LabStateMessage = { kind: "sheen-lab-state", search: serializeLabState(next) };
    frame?.contentWindow?.postMessage(message, window.location.origin);
  };
  createEffect(() => {
    const next = parseLabState(router.location().search);
    setState(next);
    send(next);
  });
  createEffect(() => setWidthDraft(state().width));
  createEffect(() => setHeightDraft(state().height));

  const publish = (next: LabState, preference?: Partial<ThemeState>): void => {
    setState(next);
    const search = serializeLabState(next);
    router.navigate(`/lab?${search}`, { replace: true });
    send(next);
    if (preference) void theme.set(preference);
  };

  onMount(() => {
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== undefined) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = undefined;
        if (!viewport) return;
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        if (width >= 320 && width <= 1600 && height >= 320 && height <= 1200 && (width !== state().width || height !== state().height)) publish({ ...state(), width, height });
      });
    });
    observer.observe(viewport);
    onCleanup(() => {
      observer.disconnect();
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    });
  });

  return <main class="loupe-lab-page">
    <h1>Cross-system laboratory</h1>
    <Text tone="muted">Every axis is URL-backed. Theme preferences persist at the root; iframe updates stay scoped and retain their component owners.</Text>
    <section class="loupe-lab-controls" aria-label="Preview axes">
      <Select label="Theme" value={state().theme} options={theme.themes().map(item => ({ value: item.id, label: item.label }))} onValueChange={value => {
        if (value && theme.themes().some(item => item.id === value)) publish({ ...state(), theme: value }, { theme: value });
      }} />
      <Select label="Accent" value={state().accent} options={accentNames.map(value => ({ value, label: value }))} onValueChange={value => {
        if (member(value, accentNames)) publish({ ...state(), accent: value }, { accent: value });
      }} />
      <Select label="Mode" value={state().mode} options={modes} onValueChange={value => {
        if (member(value, ["dark", "light", "system"])) publish({ ...state(), mode: value }, { mode: value });
      }} />
      <Select label="Density" value={state().density} options={densities} onValueChange={value => {
        if (member(value, ["compact", "comfortable", "spacious"])) publish({ ...state(), density: value }, { density: value });
      }} />
      <Select label="Radius" value={state().radius} options={radii} onValueChange={value => {
        if (member(value, ["sharp", "soft", "round"])) publish({ ...state(), radius: value }, { radius: value });
      }} />
      <Select label="Motion" value={state().motion} options={motions} onValueChange={value => {
        if (member(value, ["full", "reduced"])) publish({ ...state(), motion: value }, { motion: value });
      }} />
      <Select label="Direction" value={state().direction} options={directions} onValueChange={value => {
        if (member(value, ["ltr", "rtl"])) publish({ ...state(), direction: value }, { direction: value });
      }} />
      <Select label="Locale" value={state().locale} options={locales} onValueChange={value => {
        if (member(value, ["en-US", "de-DE", "ar-EG", "ja-JP"])) publish({ ...state(), locale: value }, { locale: value });
      }} />
      <NumberField label="Viewport width" value={widthDraft()} min={320} max={1600} step={10} onValueChange={value => {
        setWidthDraft(value);
        if (value !== null) publish({ ...state(), width: Math.round(value) });
      }} />
      <NumberField label="Viewport height" value={heightDraft()} min={320} max={1200} step={10} onValueChange={value => {
        setHeightDraft(value);
        if (value !== null) publish({ ...state(), height: Math.round(value) });
      }} />
    </section>
    <section class="loupe-lab-controls" aria-label="Debug overlays">
      <Switch label="Baseline grid" checked={state().baselineGrid} onCheckedChange={value => publish({ ...state(), baselineGrid: value })} />
      <Switch label="Spacing outlines" checked={state().spacingOutlines} onCheckedChange={value => publish({ ...state(), spacingOutlines: value })} />
      <Switch label="Always show focus rings" checked={state().focusRings} onCheckedChange={value => publish({ ...state(), focusRings: value })} />
      <Select label="Force state" value={state().forceState} options={forceStates} onValueChange={value => {
        if (member(value, ["none", "hover", "active", "focus", "disabled"])) publish({ ...state(), forceState: value });
      }} />
      <Select label="Color vision" value={state().colorVision} options={colorVisions} onValueChange={value => {
        if (member(value, ["normal", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"])) publish({ ...state(), colorVision: value });
      }} />
      <Select label="Reduced-vision blur" value={String(state().visionBlur)} options={visionBlurs} onValueChange={value => {
        if (value === "0") publish({ ...state(), visionBlur: 0 });
        else if (value === "1.5") publish({ ...state(), visionBlur: 1.5 });
        else if (value === "3") publish({ ...state(), visionBlur: 3 });
      }} />
      <Switch label="Performance meter" checked={state().performanceMeter} onCheckedChange={value => publish({ ...state(), performanceMeter: value })} />
    </section>
    <Stack gap="sm"><Text size="caption" tone="muted">Drag the preview corner or edit its dimensions with the keyboard.</Text>
      <ScrollArea label="Preview canvas" orientation="both" class="loupe-lab-stage">
        <div ref={viewport} class="loupe-lab-viewport" style={`--loupe-preview-inline:${state().width}px;--loupe-preview-block:${state().height}px`}>
          <iframe ref={frame} title="Full layout preview" src={initialSource} onLoad={() => send(state())} />
        </div>
      </ScrollArea>
    </Stack>
  </main>;
}
