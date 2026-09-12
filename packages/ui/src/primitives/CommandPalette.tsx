import { Command } from "#sheen-cmdk";
import * as KobalteDialog from "#sheen-kobalte/dialog";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, splitProps, type JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { useModalShortcutScope, useShortcut, useShortcutCommands } from "./ShortcutProvider.tsx";
import { Kbd, Text } from "./Typography.tsx";

export interface CommandPaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly group: string;
  readonly keywords?: readonly string[];
  readonly disabled?: boolean;
  readonly run: () => void | Promise<void>;
}

export interface CommandPaletteStaticSource {
  readonly kind: "static";
  readonly id: string;
  readonly commands: readonly CommandPaletteCommand[];
}

export interface CommandPaletteRemoteSource {
  readonly kind: "remote";
  readonly id: string;
  readonly initialCommands?: readonly CommandPaletteCommand[];
  readonly minimumQueryLength?: number;
  readonly search: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteCommand[]>;
}

export type CommandPaletteSource = CommandPaletteStaticSource | CommandPaletteRemoteSource;

export interface CommandPaletteRecents {
  readonly initialIds: readonly string[];
  readonly limit?: number;
  readonly save: (ids: readonly string[]) => void | Promise<void>;
  readonly onError: (error: unknown) => void;
}

export interface CommandPaletteProps {
  readonly sources: readonly CommandPaletteSource[];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly recents?: CommandPaletteRecents;
  readonly shortcutScope?: string;
  readonly onSourceError?: (sourceId: string, error: unknown) => void;
  readonly onCommandError?: (commandId: string, error: unknown) => void;
  readonly class?: string;
}

function requiredText(value: string, name: string): string {
  const result = value.trim();
  if (!result) throw new Error(`CommandPalette ${name} must be nonempty`);
  return result;
}

function validateCommands(commands: readonly CommandPaletteCommand[], name: string): readonly CommandPaletteCommand[] {
  const ids = new Set<string>();
  return Object.freeze(commands.map(command => {
    const id = requiredText(command.id, `${name} command id`);
    if (ids.has(id)) throw new Error(`CommandPalette ${name} has duplicate command id: ${id}`);
    ids.add(id);
    requiredText(command.label, `${id} label`);
    requiredText(command.group, `${id} group`);
    for (const keyword of command.keywords ?? []) requiredText(keyword, `${id} keyword`);
    return command;
  }));
}

function subsequenceScore(value: string, search: string): number {
  const candidate = Array.from(value.toLocaleLowerCase("en-US"));
  const query = Array.from(search.toLocaleLowerCase("en-US"));
  let cursor = 0;
  let gap = 0;
  for (const character of query) {
    const next = candidate.indexOf(character, cursor);
    if (next < 0) return 0;
    gap += next - cursor;
    cursor = next + 1;
  }
  return Math.max(0.1, 0.55 - gap / Math.max(candidate.length, 1) * 0.2);
}

/** Deterministic fuzzy rank used by cmdk: exact, prefix, substring, then subsequence. */
export function commandPaletteFilter(value: string, search: string, keywords: readonly string[] = []): number {
  const query = search.trim().toLocaleLowerCase("en-US");
  if (!query) return 1;
  const candidates = [value, ...keywords].map(candidate => candidate.toLocaleLowerCase("en-US"));
  let best = 0;
  for (const candidate of candidates) {
    if (candidate === query) best = Math.max(best, 1);
    else if (candidate.startsWith(query)) best = Math.max(best, 0.9);
    else if (candidate.includes(query)) best = Math.max(best, 0.7);
    else best = Math.max(best, subsequenceScore(candidate, query));
  }
  return best;
}

function validateRecentIds(ids: readonly string[]): readonly string[] {
  const unique = new Set<string>();
  for (const id of ids) {
    const value = requiredText(id, "recent id");
    if (unique.has(value)) throw new Error(`CommandPalette has duplicate recent id: ${value}`);
    unique.add(value);
  }
  return Object.freeze([...unique]);
}

export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const theme = useTheme();
  const shortcuts = useShortcutCommands();
  const [local] = splitProps(props, ["sources", "open", "defaultOpen", "onOpenChange", "recents", "shortcutScope", "onSourceError", "onCommandError", "class"]);
  const [uncontrolled, setUncontrolled] = createSignal(local.defaultOpen ?? false);
  const [search, setSearch] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [sourceError, setSourceError] = createSignal<string>();
  const [recentIds, setRecentIds] = createSignal<readonly string[]>(validateRecentIds(local.recents?.initialIds ?? []));
  const initialRemote = local.sources.flatMap(source => source.kind === "remote" ? source.initialCommands ?? [] : []);
  const [remoteCommands, setRemoteCommands] = createSignal<readonly CommandPaletteCommand[]>(validateCommands(initialRemote, "initial remote results"));
  let request = 0;
  const open = () => local.open === undefined ? uncontrolled() : local.open;
  const change = (next: boolean) => {
    if (next === open()) return;
    if (local.open === undefined) setUncontrolled(next);
    if (!next) setSearch("");
    local.onOpenChange?.(next);
  };
  const paletteId = createUniqueId();
  useShortcut({ keys: "mod+k", scope: local.shortcutScope ?? "global", label: theme.messages().openCommandPalette, group: "Navigation", run: () => change(!open()) });
  useModalShortcutScope(() => `command-palette:${paletteId}`, open);
  createEffect(() => { if (open()) onCleanup(theme.layers.register(paletteId)); });
  const layer = createMemo<number>(previous => open() ? theme.layers.zIndex(paletteId) : previous ?? 100);

  const staticCommands = createMemo(() => validateCommands(local.sources.flatMap(source => source.kind === "static" ? source.commands : []), "static sources"));
  createEffect(() => {
    const query = search().trim();
    const sources = local.sources.flatMap(source => source.kind === "remote" && query.length >= (source.minimumQueryLength ?? 1) ? [source] : []);
    const token = ++request;
    if (!sources.length) { setPending(false); setSourceError(undefined); return; }
    const controller = new AbortController();
    setPending(true);
    setSourceError(undefined);
    void Promise.all(sources.map(async source => ({ source, commands: await source.search(query, controller.signal) }))).then(results => {
      if (token !== request || controller.signal.aborted) return;
      const ids = new Set<string>();
      const accepted = results.flatMap(result => validateCommands(result.commands, `source ${result.source.id}`)).map(command => {
        if (ids.has(command.id)) throw new Error(`CommandPalette remote sources have duplicate command id: ${command.id}`);
        ids.add(command.id);
        return command;
      });
      setRemoteCommands(Object.freeze(accepted));
      setPending(false);
    }).catch(error => {
      if (token !== request || controller.signal.aborted) return;
      setPending(false);
      setSourceError(theme.messages().commandSourceFailed);
      for (const source of sources) local.onSourceError?.(source.id, error);
    });
    onCleanup(() => controller.abort());
  });

  const registeredCommands = createMemo<readonly CommandPaletteCommand[]>(() => shortcuts.bindings().filter(binding => !binding.shadowed).map(binding => Object.freeze({
    id: `shortcut:${binding.id}`,
    label: binding.label,
    group: binding.group,
    keywords: [binding.keys, binding.displayKeys, binding.scope],
    disabled: binding.keys === "mod+k" && binding.label === theme.messages().openCommandPalette,
    run: () => { shortcuts.run(binding.id); },
  })));
  const commands = createMemo(() => {
    const values = [...staticCommands(), ...remoteCommands(), ...registeredCommands()];
    const ids = new Set<string>();
    for (const command of values) {
      if (ids.has(command.id)) throw new Error(`CommandPalette has duplicate command id: ${command.id}`);
      ids.add(command.id);
    }
    return values;
  });
  const commandById = createMemo(() => new Map(commands().map(command => [command.id, command])));
  const recents = createMemo(() => search().trim() ? [] : recentIds().flatMap(id => {
    const command = commandById().get(id);
    return command && !command.disabled ? [command] : [];
  }));
  const recentSet = createMemo(() => new Set(recents().map(command => command.id)));
  const groups = createMemo(() => [...new Set(commands().filter(command => !recentSet().has(command.id)).map(command => command.group))]);
  const remember = (id: string) => {
    const persistence = local.recents;
    if (!persistence || id.startsWith("shortcut:")) return;
    const limit = persistence.limit ?? 5;
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("CommandPalette recent limit must be a positive integer");
    const next = Object.freeze([id, ...recentIds().filter(current => current !== id)].slice(0, limit));
    setRecentIds(next);
    try {
      const result = persistence.save(next);
      if (result instanceof Promise) void result.catch(persistence.onError);
    } catch (error) { persistence.onError(error); }
  };
  const select = (command: CommandPaletteCommand) => {
    if (command.disabled) return;
    change(false);
    remember(command.id);
    try {
      const result = command.run();
      if (result instanceof Promise) void result.catch(error => local.onCommandError?.(command.id, error));
    } catch (error) { local.onCommandError?.(command.id, error); }
  };
  const item = (command: CommandPaletteCommand) => {
    const binding = () => shortcuts.bindings().find(value => `shortcut:${value.id}` === command.id);
    return <Command.Item value={`${command.id} ${command.label}`} keywords={[...(command.keywords ?? [])]}
      {...(command.disabled === undefined ? {} : { disabled: command.disabled })} onSelect={() => select(command)}>
      <span>{command.label}</span><Show when={binding()}>{value => <Kbd>{value().displayKeys}</Kbd>}</Show>
    </Command.Item>;
  };

  return <KobalteDialog.Root open={open()} onOpenChange={change}><Show when={theme.portal()}>{target => <KobalteDialog.Portal mount={target()}>
    <KobalteDialog.Overlay class="sheen-command-overlay" style={{ "z-index": layer() }} />
    <KobalteDialog.Content class="sheen-command-dialog" style={{ "z-index": layer() + 1 }} aria-label={theme.messages().commandPalette}
      onEscapeKeyDown={event => { if (!theme.layers.isTop(paletteId)) event.preventDefault(); }}>
      <Command class={cn("sheen-command-palette", local.class)} label={theme.messages().commandPalette}
        filter={(value, query, keywords) => commandPaletteFilter(value, query, keywords)} loop data-refreshing={pending() || undefined}>
        <Command.Input value={search()} onValueChange={setSearch} placeholder={theme.messages().searchCommands} aria-label={theme.messages().searchCommands} />
        <Command.List label={theme.messages().commandResults}>
          <Show when={pending()}><Command.Loading label={theme.messages().loading}>{theme.messages().refreshingCommands}</Command.Loading></Show>
          <Show when={sourceError()}>{message => <div role="alert"><Text tone="muted">{message()}</Text></div>}</Show>
          <Command.Empty>{theme.messages().noResults}</Command.Empty>
          <Show when={recents().length}><Command.Group heading={theme.messages().recentCommands}><For each={recents()}>{item}</For></Command.Group></Show>
          <For each={groups()}>{group => <Command.Group heading={group}><For each={commands().filter(command => command.group === group && !recentSet().has(command.id))}>{item}</For></Command.Group>}</For>
        </Command.List>
      </Command>
    </KobalteDialog.Content>
  </KobalteDialog.Portal>}</Show></KobalteDialog.Root>;
}
