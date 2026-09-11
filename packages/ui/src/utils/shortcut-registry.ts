export interface ShortcutDefinition {
  readonly keys: string;
  readonly scope: string;
  readonly label: string;
  readonly group: string;
  readonly developmentOnly?: boolean;
  readonly run: () => void | Promise<void>;
}
export interface ShortcutAction {
  readonly keys: string;
  readonly label: string;
  readonly group: string;
  readonly scope?: string;
  readonly developmentOnly?: boolean;
}
export interface ShortcutInput {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly editing: boolean;
  readonly composing?: boolean;
  readonly repeat?: boolean;
  readonly characterShortcuts?: boolean;
}
export interface ShortcutRegistryOptions {
  readonly platform: "mac" | "other";
  readonly development: boolean;
  readonly warn?: (message: string) => void;
  readonly onError?: (error: unknown) => void;
  readonly onPending?: (pending: readonly PendingShortcut[]) => void;
  readonly onChange?: (bindings: readonly ShortcutBinding[]) => void;
}
export interface ShortcutBinding {
  readonly id: number;
  readonly scope: string;
  readonly keys: string;
  readonly displayKeys: string;
  readonly label: string;
  readonly group: string;
  readonly characterOnly: boolean;
  readonly shadowed: boolean;
}
export interface PendingShortcut {
  readonly keys: string;
  readonly displayKeys: string;
  readonly label: string;
  readonly scope: string;
  readonly completed: number;
}
type ShortcutEntry = { definition: ShortcutDefinition; chords: string[]; displayKeys: string; characterOnly: boolean; id: number; active: boolean };
interface Chord {
  readonly key: string;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}
const aliases = new Map([["esc", "escape"], ["return", "enter"], ["space", " "], ["plus", "+"]]);
const normalizeKey = (key: string) => aliases.get(key.toLowerCase()) ?? key.toLowerCase();
const identity = (chord: Chord) => JSON.stringify([chord.ctrl, chord.meta, chord.alt, chord.shift, chord.key]);
const protectedChord = (chord: Chord) => (chord.ctrl || chord.meta) && ["r", "l", "t", "w"].includes(chord.key);

function parseChord(keys: string, platform: ShortcutRegistryOptions["platform"]): Chord {
  const parts = keys.trim().toLowerCase().split("+").map(part => part.trim());
  const keyPart = parts.pop();
  if (!keyPart || /\s/.test(keyPart)) throw new Error(`Expected one shortcut chord: ${keys}`);
  const modifiers = new Set<string>();
  for (const part of parts) {
    const modifier = part === "mod" ? platform === "mac" ? "meta" : "ctrl" : part;
    if (!["ctrl", "meta", "alt", "shift"].includes(modifier) || modifiers.has(modifier)) throw new Error(`Invalid or duplicate shortcut modifier: ${keys}`);
    modifiers.add(modifier);
  }
  const key = normalizeKey(keyPart);
  if (["ctrl", "meta", "alt", "shift", "mod"].includes(key)) throw new Error(`Shortcut requires a non-modifier key: ${keys}`);
  // KeyboardEvent.key already includes the shift used to produce punctuation such as '?'.
  const shift = modifiers.has("shift") && !(key.length === 1 && /[^a-z0-9 ]/.test(key));
  const chord = { key, ctrl: modifiers.has("ctrl"), meta: modifiers.has("meta"), alt: modifiers.has("alt"), shift };
  if (protectedChord(chord)) throw new Error(`Reserved browser shortcut: ${keys}`);
  return chord;
}

/** Pure registry core. The browser owner supplies active scopes, input context, and event prevention. */
export function createShortcutRegistry(options: ShortcutRegistryOptions) {
  const scopes = new Map<string, Map<string, ShortcutEntry[]>>();
  let nextId = 0;
  let disposed = false;
  let pending: { entries: ShortcutEntry[]; completed: number; scopes: string; expires: number; characterShortcuts: boolean } | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const snapshot = (): readonly ShortcutBinding[] => Object.freeze([...scopes].flatMap(([scope, bindings]) => [...bindings.values()].flatMap(entries => entries.map((entry, index) => Object.freeze({
    id: entry.id, scope, keys: entry.definition.keys, displayKeys: entry.displayKeys, label: entry.definition.label, group: entry.definition.group, characterOnly: entry.characterOnly, shadowed: index < entries.length - 1,
  })))));
  const cancelPending = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (!pending) return;
    pending = undefined;
    options.onPending?.(Object.freeze([]));
  };
  const execute = (entry: ShortcutEntry): void => {
    const result = entry.definition.run();
    if (result) void Promise.resolve(result).catch(error => {
      if (disposed || !entry.active) return;
      try {
        if (options.onError) options.onError(error);
        else queueMicrotask(() => { throw error; });
      } catch (reportingError) { queueMicrotask(() => { throw reportingError; }); }
    });
  };
  const advance = (entries: ShortcutEntry[], completed: number, activeScopes: readonly string[], characterShortcuts: boolean, beforeRun?: () => void): boolean => {
    cancelPending();
    beforeRun?.();
    const complete = entries.find(entry => entry.chords.length === completed);
    if (complete) execute(complete);
    else {
      pending = { entries, completed, scopes: JSON.stringify(activeScopes), expires: performance.now() + 1000, characterShortcuts };
      timer = setTimeout(cancelPending, 1000);
      options.onPending?.(Object.freeze(entries.map(entry => Object.freeze({ keys: entry.definition.keys, displayKeys: entry.displayKeys, label: entry.definition.label, scope: entry.definition.scope, completed }))));
    }
    return true;
  };
  return {
    cancelPending,
    register(definition: ShortcutDefinition): () => void {
      if (disposed) throw new Error("Cannot register a shortcut on a disposed registry");
      if (definition.developmentOnly && !options.development) return () => {};
      if (!definition.scope.trim() || !definition.label.trim() || !definition.group.trim()) throw new Error("Shortcuts require nonempty scope, label, and group");
      const parsed = definition.keys.trim().replace(/\s*\+\s*/g, "+").split(/\s+/).map((keys, index) => {
        const chord = parseChord(keys, options.platform);
        if (index > 0 && chord.key === "escape" && !chord.ctrl && !chord.meta && !chord.alt && !chord.shift) throw new Error("Escape is reserved for cancelling a pending sequence");
        return chord;
      });
      const chords = parsed.map(identity);
      const keyLabels = new Map([["escape", "Esc"], [" ", "Space"], ["enter", "Enter"]]);
      const displayKeys = parsed.map(chord => [chord.ctrl ? "Ctrl" : "", chord.alt ? options.platform === "mac" ? "⌥" : "Alt" : "", chord.shift ? options.platform === "mac" ? "⇧" : "Shift" : "", chord.meta ? options.platform === "mac" ? "⌘" : "Meta" : "", keyLabels.get(chord.key) ?? chord.key.toUpperCase()].filter(Boolean).join("+")).join(" → ");
      const characterOnly = parsed.every(chord => !chord.ctrl && !chord.meta && !chord.alt && Array.from(chord.key).length === 1);
      const key = JSON.stringify(chords);
      const scope = scopes.get(definition.scope) ?? new Map<string, ShortcutEntry[]>();
      for (const existing of scope.values()) {
        const previous = existing.at(-1);
        if (previous && previous.chords.length !== chords.length && previous.chords.slice(0, Math.min(previous.chords.length, chords.length)).every((chord, index) => chord === chords[index])) {
          throw new Error(`Ambiguous shortcut prefix in ${definition.scope}: "${previous.definition.label}" and "${definition.label}"`);
        }
      }
      const entries = scope.get(key) ?? [];
      const previous = entries.at(-1);
      if (previous) {
        const message = `Shortcut collision in ${definition.scope}: "${previous.definition.label}" and "${definition.label}" (${definition.keys})`;
        if (options.development) throw new Error(message);
        (options.warn ?? console.warn)(message);
      }
      cancelPending();
      const entry = { definition: Object.freeze({ ...definition }), chords, displayKeys, characterOnly, id: ++nextId, active: true };
      entries.push(entry);
      scope.set(key, entries);
      scopes.set(definition.scope, scope);
      options.onChange?.(snapshot());
      return () => {
        if (pending?.entries.includes(entry)) cancelPending();
        entry.active = false;
        const index = entries.indexOf(entry);
        if (index < 0) return;
        entries.splice(index, 1);
        if (!entries.length) scope.delete(key);
        if (!scope.size) scopes.delete(definition.scope);
        options.onChange?.(snapshot());
      };
    },
    /** Scopes are ordered outermost to innermost. Only the winning action executes. */
    dispatch(input: ShortcutInput, activeScopes: readonly string[], beforeRun?: () => void): boolean {
      if (disposed || input.repeat) return false;
      if (input.composing) { cancelPending(); return false; }
      const key = normalizeKey(input.key);
      const characterShortcuts = input.characterShortcuts !== false;
      const chord: Chord = { key, ctrl: input.ctrlKey, meta: input.metaKey, alt: input.altKey,
        shift: input.shiftKey && !(key.length === 1 && /[^a-z0-9 ]/.test(key)) };
      if (protectedChord(chord) || (input.editing && !chord.ctrl && !chord.meta)) { cancelPending(); return false; }
      if (pending && (pending.characterShortcuts !== characterShortcuts || pending.scopes !== JSON.stringify(activeScopes) || performance.now() >= pending.expires)) cancelPending();
      if (pending) {
        if (key === "escape" && !chord.ctrl && !chord.meta && !chord.alt && !chord.shift) { cancelPending(); beforeRun?.(); return true; }
        // Modifier presses between strokes do not interrupt modified sequences.
        if (["control", "meta", "alt", "shift"].includes(key)) return false;
        const current = pending;
        const completed = current.completed + 1;
        const candidates = current.entries.filter(entry => entry.active && entry.chords[current.completed] === identity(chord));
        if (candidates.length) return advance(candidates, completed, activeScopes, characterShortcuts, beforeRun);
        cancelPending();
      }
      for (const scope of [...activeScopes].reverse()) {
        const entries = [...(scopes.get(scope)?.values() ?? [])].flatMap(entries => {
          const entry = entries.at(-1);
          return entry?.chords[0] === identity(chord) && (characterShortcuts || !entry.characterOnly) ? [entry] : [];
        });
        if (entries.length) return advance(entries, 1, activeScopes, characterShortcuts, beforeRun);
      }
      return false;
    },
    snapshot,
    run(id: number): boolean {
      if (disposed || !Number.isSafeInteger(id)) return false;
      for (const scope of scopes.values()) {
        for (const entries of scope.values()) {
          const entry = entries.at(-1);
          if (entry?.id === id && entry.active) {
            cancelPending();
            execute(entry);
            return true;
          }
        }
      }
      return false;
    },
    dispose(): void { if (disposed) return; disposed = true; cancelPending(); scopes.clear(); options.onChange?.(snapshot()); },
  };
}
