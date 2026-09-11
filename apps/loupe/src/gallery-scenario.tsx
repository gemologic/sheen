import { For, Match, Switch, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { Button, CommandPalette, EmptyState, Heading, Select, ShortcutProvider, Skeleton, Text } from "@gemologic/sheen";
import type { CommandPaletteSource, SelectOption } from "@gemologic/sheen";
import { ErrorState } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";

export type GalleryScenarioState = "ready" | "empty" | "loading" | "error" | "permission";

const states: readonly SelectOption[] = [
  { value: "ready", label: "Ready" },
  { value: "empty", label: "Empty" },
  { value: "loading", label: "Loading" },
  { value: "error", label: "Server error" },
  { value: "permission", label: "Permission denied" },
];

function readState(search: string): GalleryScenarioState {
  const value = new URLSearchParams(search).get("state");
  return value === "empty" || value === "loading" || value === "error" || value === "permission" ? value : "ready";
}

export interface GalleryScenarioProps {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly emptyHeading: string;
  readonly emptyDescription: string;
  readonly insideShell?: boolean;
  readonly children: (revision: Accessor<number>) => JSX.Element;
}

export function GalleryScenario(props: GalleryScenarioProps): JSX.Element {
  return <ShortcutProvider development={true}><GalleryScenarioRuntime {...props} /></ShortcutProvider>;
}

function GalleryScenarioRuntime(props: GalleryScenarioProps): JSX.Element {
  const router = useSolidRouterAdapter();
  const state = () => readState(router.location().search);
  const [refreshing, setRefreshing] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  const [commandsOpen, setCommandsOpen] = createSignal(false);
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const stopRefresh = (): void => {
    if (refreshTimer !== undefined) clearTimeout(refreshTimer);
    refreshTimer = undefined;
    setRefreshing(false);
  };
  createEffect(() => { if (state() !== "ready") stopRefresh(); });
  onCleanup(stopRefresh);
  const publish = (next: GalleryScenarioState): void => {
    stopRefresh();
    router.navigate(next === "ready" ? props.path : `${props.path}?state=${next}`, { replace: true });
  };
  const refresh = (): void => {
    if (refreshing() || state() !== "ready") return;
    setRefreshing(true);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      setRevision(value => value + 1);
      setRefreshing(false);
    }, 650);
  };
  const commandSources = createMemo<readonly CommandPaletteSource[]>(() => [{
    kind: "static",
    id: `gallery:${props.path}`,
    commands: [
      { id: "refresh", label: "Refresh scenario", group: "Scenario", keywords: ["reload", "revalidate"], disabled: state() !== "ready" || refreshing(), run: refresh },
      { id: "ready", label: "Show ready state", group: "States", disabled: state() === "ready", run: () => publish("ready") },
      { id: "empty", label: "Show empty state", group: "States", disabled: state() === "empty", run: () => publish("empty") },
      { id: "loading", label: "Show cold loading state", group: "States", disabled: state() === "loading", run: () => publish("loading") },
      { id: "error", label: "Show server error", group: "States", disabled: state() === "error", run: () => publish("error") },
      { id: "permission", label: "Show permission denied", group: "States", disabled: state() === "permission", run: () => publish("permission") },
    ],
  }]);
  const content = <>
    <header class="loupe-gallery-scenario-heading">
      <div><Heading level={1}>{props.title}</Heading><Text tone="muted">{props.description}</Text></div>
      <div class="loupe-gallery-scenario-controls" aria-label={`${props.title} controls`}>
        <Select label="Scenario state" value={state()} options={states} onValueChange={value => {
          if (value === "ready" || value === "empty" || value === "loading" || value === "error" || value === "permission") publish(value);
        }} />
        <Button onClick={() => setCommandsOpen(true)}>Open commands</Button>
        <Button onClick={refresh} disabled={state() !== "ready" || refreshing()}>Refresh scenario</Button>
        <output aria-label="Scenario revision">Revision {revision()}</output>
      </div>
    </header>
    <Switch>
      <Match when={state() === "loading"}><section class="loupe-gallery-scenario-loading" aria-label={`Loading ${props.title}`} aria-busy="true"><For each={[1, 2, 3, 4, 5, 6]}>{() => <Skeleton />}</For></section></Match>
      <Match when={state() === "empty"}><EmptyState heading={props.emptyHeading} description={props.emptyDescription}><Button onClick={() => publish("ready")}>Load sample content</Button></EmptyState></Match>
      <Match when={state() === "error"}><ErrorState kind="server" description={`${props.title} could not load an accepted snapshot.`} onRetry={() => publish("ready")} /></Match>
      <Match when={state() === "permission"}><ErrorState kind="permission-denied" description={`${props.title} was removed immediately when access changed.`} onRetry={() => publish("ready")} /></Match>
      <Match when={state() === "ready"}><section class="loupe-gallery-scenario-content" data-gallery-content={props.path} data-pending={refreshing() || undefined} aria-busy={refreshing()}>{props.children(revision)}</section></Match>
    </Switch>
    <CommandPalette sources={commandSources()} open={commandsOpen()} onOpenChange={setCommandsOpen} />
  </>;
  return props.insideShell
    ? <div class="loupe-gallery-scenario" data-gallery-scenario={props.path} data-inside-shell>{content}</div>
    : <main class="loupe-gallery-scenario" data-gallery-scenario={props.path}>{content}</main>;
}
