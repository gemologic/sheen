import { createContext, createEffect, createMemo, createSignal, getOwner, onCleanup, onMount, useContext } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { createShortcutRegistry } from "../utils/shortcut-registry.ts";
import { resolveShortcutPlatform } from "../utils/shortcut-platform.ts";
import type { PendingShortcut, ShortcutAction, ShortcutBinding, ShortcutDefinition } from "../utils/shortcut-registry.ts";

export interface ShortcutProviderProps {
  children?: JSX.Element;
  platform?: "mac" | "other";
  development: boolean;
  activeScopes?: readonly string[];
  characterShortcuts?: boolean;
  onError?: (error: unknown) => void;
}
const ShortcutContext = createContext<{ registry: Accessor<ReturnType<typeof createShortcutRegistry> | undefined>; pending: Accessor<readonly PendingShortcut[]>; bindings: Accessor<readonly ShortcutBinding[]>; characterShortcuts: Accessor<boolean>; acquireModal: (scope: string) => () => void; acquireFocusScope: (element: HTMLElement, scope: string) => () => void; acquireKeyboardOwner: (element: HTMLElement) => () => void }>();

/** One provider per document. Dialogs override application-owned base scopes while open. */
export function ShortcutProvider(props: ShortcutProviderProps): JSX.Element {
  if (useContext(ShortcutContext)) throw new Error("ShortcutProvider cannot be nested; use shared scope IDs");
  const report = (error: unknown) => { if (props.onError) props.onError(error); else queueMicrotask(() => { throw error; }); };
  const [pending, setPending] = createSignal<readonly PendingShortcut[]>([]);
  const [bindings, setBindings] = createSignal<readonly ShortcutBinding[]>([]);
  const baseScopes = createMemo(() => props.activeScopes ?? ["global"]);
  const [modals, setModals] = createSignal<readonly { id: number; scope: string }[]>([]);
  let nextModal = 0;
  const activeScopes = createMemo(() => { const modal = modals().at(-1); return modal ? [modal.scope] : baseScopes(); });
  const acquireModal = (scope: string) => {
    if (!scope.trim()) throw new Error("Dialog shortcut scopes require a nonempty ID");
    const id = ++nextModal;
    setModals(current => {
      if (current.some(modal => modal.scope === scope)) throw new Error(`Dialog shortcut scope already active: ${scope}`);
      return [...current, { id, scope }];
    });
    let removed = false;
    return () => { if (removed) return; removed = true; setModals(current => current.filter(modal => modal.id !== id)); };
  };
  const characterShortcuts = createMemo(() => props.characterShortcuts !== false);
  const development = props.development;
  const makeRegistry = (platform: "mac" | "other") => createShortcutRegistry({ platform, development, onError: report, onPending: value => setPending(value), onChange: value => setBindings(value) });
  const [registry, setRegistry] = createSignal(props.platform === undefined ? undefined : makeRegistry(props.platform));
  const focusScopes = new WeakMap<EventTarget, string>();
  const scopeElements = new Map<string, HTMLElement>();
  const keyboardOwners = new WeakSet<EventTarget>();
  const acquireKeyboardOwner = (element: HTMLElement) => {
    keyboardOwners.add(element);
    registry()?.cancelPending();
    return () => { keyboardOwners.delete(element); registry()?.cancelPending(); };
  };
  const acquireFocusScope = (element: HTMLElement, scope: string) => {
    if (!scope.trim() || scope === "global") throw new Error("ShortcutScope requires a nonempty, non-global scope ID");
    if (scopeElements.has(scope)) throw new Error(`ShortcutScope already mounted: ${scope}`);
    scopeElements.set(scope, element);
    focusScopes.set(element, scope);
    registry()?.cancelPending();
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      scopeElements.delete(scope);
      focusScopes.delete(element);
      registry()?.cancelPending();
    };
  };
  createEffect(() => { activeScopes(); characterShortcuts(); registry()?.cancelPending(); });
  onCleanup(() => registry()?.dispose());
  onMount(() => {
    if (!registry()) setRegistry(makeRegistry(resolveShortcutPlatform(navigator.platform)));
    const cancelPending = () => registry()?.cancelPending();
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.getModifierState("AltGraph")) { cancelPending(); return; }
      const path = event.composedPath();
      if (!event.ctrlKey && !event.metaKey && path.some(target => keyboardOwners.has(target))) { cancelPending(); return; }
      const focusedScopes = path.flatMap(target => { const scope = focusScopes.get(target); return scope ? [scope] : []; }).reverse();
      const scopes = modals().length ? activeScopes() : [...new Set([...activeScopes().filter(scope => !focusedScopes.includes(scope)), ...focusedScopes])];
      const editing = path.some(target => target instanceof HTMLElement &&
        (target.matches("input, textarea, select, [role=textbox]") || target.isContentEditable));
      try {
        registry()?.dispatch({ key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey, shiftKey: event.shiftKey,
          editing, characterShortcuts: characterShortcuts(), composing: event.isComposing || event.key === "Process", repeat: event.repeat }, scopes, () => event.preventDefault());
      } catch (error) {
        report(error);
      }
    };
    document.addEventListener("keydown", handle);
    document.addEventListener("focusin", cancelPending);
    document.addEventListener("pointerdown", cancelPending, true);
    document.addEventListener("compositionstart", cancelPending);
    window.addEventListener("blur", cancelPending);
    onCleanup(() => {
      document.removeEventListener("keydown", handle);
      document.removeEventListener("focusin", cancelPending);
      document.removeEventListener("pointerdown", cancelPending, true);
      document.removeEventListener("compositionstart", cancelPending);
      window.removeEventListener("blur", cancelPending);
    });
  });
  return <ShortcutContext.Provider value={{ registry, pending, bindings, characterShortcuts, acquireModal, acquireFocusScope, acquireKeyboardOwner }}>{props.children}</ShortcutContext.Provider>;
}

/** Register in the nearest provider and release the binding with its Solid owner. */
export function useShortcut(definition: ShortcutDefinition): void {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("useShortcut requires an owned ShortcutProvider context");
  createEffect(() => { const registry = context.registry(); if (registry) onCleanup(registry.register({ ...definition })); });
}

/** Internal control binding. Outside a provider the control remains usable without a shortcut. */
export function useShortcutAction(action: Accessor<ShortcutAction | undefined>, run: () => void): Accessor<ShortcutBinding | undefined> {
  if (!getOwner()) throw new Error("shortcut actions require an owned component context");
  const context = useContext(ShortcutContext);
  if (!context) return () => undefined;
  createEffect(() => {
    const registry = context.registry();
    const value = action();
    if (!registry || !value) return;
    onCleanup(registry.register({
      keys: value.keys,
      label: value.label,
      group: value.group,
      scope: value.scope ?? "global",
      ...(value.developmentOnly === undefined ? {} : { developmentOnly: value.developmentOnly }),
      run,
    }));
  });
  return createMemo(() => {
    const value = action();
    if (!value) return undefined;
    const scope = value.scope ?? "global";
    return context.bindings().findLast(binding => binding.keys === value.keys && binding.scope === scope && binding.label === value.label && binding.group === value.group);
  });
}

/** Read immutable pending candidates to render contextual, localized sequence feedback. */
export function usePendingShortcut(): Accessor<readonly PendingShortcut[]> {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("usePendingShortcut requires an owned ShortcutProvider context");
  return context.pending;
}

/** Observe all registered bindings, including inactive scopes and same-scope shadows. */
export function useShortcutBindings(): Accessor<readonly ShortcutBinding[]> {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("useShortcutBindings requires an owned ShortcutProvider context");
  return context.bindings;
}

/** Execute the current winning registration by its introspected binding ID. */
export function useShortcutCommands(): { readonly bindings: Accessor<readonly ShortcutBinding[]>; readonly run: (id: number) => boolean } {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("useShortcutCommands requires an owned ShortcutProvider context");
  return { bindings: context.bindings, run: id => context.registry()?.run(id) ?? false };
}

export function useCharacterShortcuts(): Accessor<boolean> {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("useCharacterShortcuts requires an owned ShortcutProvider context");
  return context.characterShortcuts;
}

/** Optional integration for modal primitives; standalone dialogs need no shortcut provider. */
export function useModalShortcutScope(scope: Accessor<string>, active: Accessor<boolean>): void {
  const context = useContext(ShortcutContext);
  if (!context) return;
  createEffect(() => { if (active()) onCleanup(context.acquireModal(scope())); });
}

/** Internal DOM-bound scope registration. Debug attributes alone do not activate scopes. */
export function useFocusShortcutScope(scope: Accessor<string>, element: Accessor<HTMLElement | undefined>): void {
  const context = useContext(ShortcutContext);
  if (!context || !getOwner()) throw new Error("ShortcutScope requires an owned ShortcutProvider context");
  createEffect(() => { const node = element(); if (node) onCleanup(context.acquireFocusScope(node, scope())); });
}

/** Optional integration for widgets whose own typeahead/navigation consumes unmodified keys. */
export function useShortcutKeyboardOwner(element: Accessor<HTMLElement | undefined>, active: Accessor<boolean>): void {
  const context = useContext(ShortcutContext);
  if (!context) return;
  createEffect(() => { const node = element(); if (active() && node) onCleanup(context.acquireKeyboardOwner(node)); });
}
