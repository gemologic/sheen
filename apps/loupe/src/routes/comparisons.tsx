import { createEffect, createSignal } from "solid-js";
import { Button, Card, Grid, Heading, Input, NumberField, ScrollArea, Select, Stack, Text, ThemeScope, useTheme } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { accentNames } from "@gemologic/sheen-tokens";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { parseComparisonState, serializeComparisonState, serializeLabState } from "../lab-state.ts";
import type { ComparisonState, LabState, LabStateMessage } from "../lab-state.ts";

const modes: readonly SelectOption[] = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];
const densities: readonly SelectOption[] = [{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }];

function member<T extends string>(value: string | null, accepted: readonly T[]): value is T {
  return value !== null && accepted.some(candidate => candidate === value);
}

interface PaneControlsProps {
  readonly label: string;
  readonly state: LabState;
  readonly onChange: (state: LabState) => void;
}

function PaneControls(props: PaneControlsProps) {
  const theme = useTheme();
  const [widthDraft, setWidthDraft] = createSignal<number | null>(props.state.width);
  createEffect(() => setWidthDraft(props.state.width));
  return <fieldset class="loupe-comparison-controls">
    <legend>{props.label}</legend>
    <Select label={`${props.label} theme`} value={props.state.theme} options={theme.themes().map(item => ({ value: item.id, label: item.label }))} onValueChange={value => {
      if (value && theme.themes().some(item => item.id === value)) props.onChange({ ...props.state, theme: value });
    }} />
    <Select label={`${props.label} accent`} value={props.state.accent} options={accentNames.map(value => ({ value, label: value }))} onValueChange={value => {
      if (member(value, accentNames)) props.onChange({ ...props.state, accent: value });
    }} />
    <Select label={`${props.label} mode`} value={props.state.mode} options={modes} onValueChange={value => {
      if (member(value, ["dark", "light", "system"])) props.onChange({ ...props.state, mode: value });
    }} />
    <Select label={`${props.label} density`} value={props.state.density} options={densities} onValueChange={value => {
      if (member(value, ["compact", "comfortable", "spacious"])) props.onChange({ ...props.state, density: value });
    }} />
    <NumberField label={`${props.label} width`} value={widthDraft()} min={320} max={1600} step={10} onValueChange={value => {
      setWidthDraft(value);
      if (value !== null) props.onChange({ ...props.state, width: Math.round(value) });
    }} />
  </fieldset>;
}

function ComponentSample(props: { readonly label: string }) {
  const [count, setCount] = createSignal(0);
  return <Card class="loupe-comparison-sample">
    <Heading level={2} size="h3">{props.label} components</Heading>
    <Text tone="muted">Independent context, portal target, and local component state.</Text>
    <Input label={`${props.label} retained draft`} placeholder="Type, then change an axis" />
    <Button variant="solid" tone="accent" onClick={() => setCount(value => value + 1)}>Increment</Button>
    <output aria-live="polite">Count {count()}</output>
  </Card>;
}

export default function Comparisons() {
  const router = useSolidRouterAdapter();
  const [state, setState] = createSignal(parseComparisonState(router.location().search));
  let firstFrame: HTMLIFrameElement | undefined;
  let secondFrame: HTMLIFrameElement | undefined;
  const initial = state();

  const send = (frame: HTMLIFrameElement | undefined, next: LabState): void => {
    const message: LabStateMessage = { kind: "sheen-lab-state", search: serializeLabState(next) };
    frame?.contentWindow?.postMessage(message, window.location.origin);
  };
  const broadcast = (next: ComparisonState): void => {
    send(firstFrame, next.first);
    send(secondFrame, next.second);
  };
  createEffect(() => {
    const next = parseComparisonState(router.location().search);
    setState(next);
    broadcast(next);
  });
  const publish = (next: ComparisonState): void => {
    setState(next);
    router.navigate(`/comparisons?${serializeComparisonState(next)}`, { replace: true });
    broadcast(next);
  };
  const update = (pane: keyof ComparisonState, next: LabState): void => publish({ ...state(), [pane]: next });
  const swap = (): void => publish({ first: state().second, second: state().first });

  return <main class="loupe-comparisons-page">
    <div><Heading level={1}>Theme comparisons</Heading><Text tone="muted">Compare isolated component contexts and full layouts without remounting either side.</Text></div>
    <Grid columns={2} gap="lg" class="loupe-comparison-toolbar">
      <PaneControls label="A" state={state().first} onChange={next => update("first", next)} />
      <PaneControls label="B" state={state().second} onChange={next => update("second", next)} />
    </Grid>
    <Button variant="outline" onClick={swap}>Swap A and B</Button>
    <section aria-labelledby="component-comparison-heading">
      <Heading id="component-comparison-heading" level={2}>Component scopes</Heading>
      <Grid columns={2} gap="lg" class="loupe-comparison-grid">
        <ThemeScope theme={state().first.theme} mode={state().first.mode} accent={state().first.accent} density={state().first.density} radius={state().first.radius} motion={state().first.motion} direction={state().first.direction} locale={state().first.locale} class="loupe-comparison-scope loupe-comparison-first"><ComponentSample label="A" /></ThemeScope>
        <ThemeScope theme={state().second.theme} mode={state().second.mode} accent={state().second.accent} density={state().second.density} radius={state().second.radius} motion={state().second.motion} direction={state().second.direction} locale={state().second.locale} class="loupe-comparison-scope loupe-comparison-second"><ComponentSample label="B" /></ThemeScope>
      </Grid>
    </section>
    <section aria-labelledby="layout-comparison-heading">
      <Heading id="layout-comparison-heading" level={2}>Full-layout iframes</Heading>
      <Grid columns={2} gap="lg" class="loupe-comparison-grid">
        <Stack gap="sm"><Text><strong>A at {state().first.width}px</strong></Text><ScrollArea label="A layout canvas" orientation="both" class="loupe-comparison-stage"><div class="loupe-comparison-frame" style={`--loupe-comparison-width:${state().first.width}px;--loupe-comparison-height:${state().first.height}px`}><iframe ref={firstFrame} title="A full layout" src={`/lab-preview?${serializeLabState(initial.first)}`} onLoad={() => send(firstFrame, state().first)} /></div></ScrollArea></Stack>
        <Stack gap="sm"><Text><strong>B at {state().second.width}px</strong></Text><ScrollArea label="B layout canvas" orientation="both" class="loupe-comparison-stage"><div class="loupe-comparison-frame" style={`--loupe-comparison-width:${state().second.width}px;--loupe-comparison-height:${state().second.height}px`}><iframe ref={secondFrame} title="B full layout" src={`/lab-preview?${serializeLabState(initial.second)}`} onLoad={() => send(secondFrame, state().second)} /></div></ScrollArea></Stack>
      </Grid>
    </section>
  </main>;
}
