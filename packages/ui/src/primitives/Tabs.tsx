import * as Primitive from "#sheen-kobalte/tabs";
import { For, createEffect, createMemo, createSignal, createUniqueId, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { cn } from "../utils/cn.ts";

export interface TabOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface TabsProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  label: string;
  items: readonly TabOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  children: (value: string) => JSX.Element;
}

function Trigger(props: { value: string; id: string; label: string; disabled: boolean; selected: boolean }): JSX.Element {
  const context = Primitive.useTabsContext();
  const tabIndex = () => props.disabled ? -1 : (context.listState().selectionManager().focusedKey() ?? (props.selected ? props.value : undefined)) === props.value ? 0 : -1;
  return <Primitive.Trigger as={Button} value={props.value} id={`${props.id}-tab`} aria-controls={`${props.id}-panel`} disabled={props.disabled} tabIndex={tabIndex()} class="sheen-tabs-trigger">{props.label}</Primitive.Trigger>;
}

export function Tabs(props: TabsProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "items", "value", "defaultValue", "onValueChange", "orientation", "activationMode", "children", "class", "id", "ref"]);
  const generatedId = createUniqueId();
  const id = () => local.id ?? `sheen-tabs-${generatedId}`;
  let root: HTMLDivElement | undefined;
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const preserveFocus = () => {
    const element = root;
    const focused = element?.ownerDocument.activeElement;
    if (!element || !(focused instanceof HTMLElement) || !element.contains(focused)) return;
    element.ownerDocument.defaultView?.queueMicrotask(() => {
      if (disposed || !element.isConnected) return;
      const active = element.ownerDocument.activeElement;
      if (active !== element.ownerDocument.body && active !== focused) return;
      const eligible = (target: HTMLElement) => target.isConnected && !target.matches(":disabled") && !target.closest("[hidden], [inert]");
      const retained = element.contains(focused) && eligible(focused) ? focused : undefined;
      const selectedTab = [...element.querySelectorAll<HTMLButtonElement>('[role="tab"][aria-selected="true"]')]
        .find(tab => tab.closest(".sheen-tabs") === element && eligible(tab));
      (retained ?? selectedTab ?? element).focus({ preventScroll: true });
    });
  };
  const entries = createMemo(() => {
    if (!local.label.trim()) throw new Error("Tabs requires a nonempty accessible label");
    const result = new Map<string, TabOption>();
    for (const item of local.items) {
      if (!item.value.trim() || !item.label.trim()) throw new Error("Tabs requires nonempty item values and labels");
      if (result.has(item.value)) throw new Error(`Tabs duplicate item value: ${item.value}`);
      result.set(item.value, item);
    }
    return result;
  });
  const [draft, setDraft] = createSignal(local.defaultValue);
  let previousKeys: string[] = [];
  const selected = createMemo(() => {
    preserveFocus();
    const current = entries();
    const keys = [...current.keys()];
    const requested = local.value ?? draft();
    const index = Math.max(0, requested === undefined ? 0 : previousKeys.indexOf(requested));
    previousKeys = keys;
    if (local.value !== undefined && (!current.has(local.value) || current.get(local.value)?.disabled)) throw new Error("Tabs controlled value must identify an enabled item");
    if (requested !== undefined && current.has(requested) && !current.get(requested)?.disabled) return requested;
    const enabled = (value: string) => !current.get(value)?.disabled;
    return keys.slice(index).find(enabled) ?? keys.slice(0, index).reverse().find(enabled);
  });
  createEffect(() => {
    if (local.value !== undefined) return;
    const previous = draft();
    const next = selected();
    if (previous === next) return;
    setDraft(next);
    if (previous !== undefined && next !== undefined) local.onValueChange?.(next);
  });
  const change = (encoded: string) => {
    const next = decodeURIComponent(encoded);
    if (!entries().has(next) || entries().get(next)?.disabled || next === selected()) return;
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  return <Primitive.Root {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} tabIndex={others.tabIndex ?? -1} id={id()} class={cn("sheen-tabs", local.class)} value={encodeURIComponent(selected() ?? "")} onChange={change} orientation={local.orientation ?? "horizontal"} activationMode={local.activationMode ?? "automatic"}>
    <Primitive.List aria-label={local.label} class="sheen-tabs-list">
      <For each={[...entries().keys()]}>{value => <Trigger value={encodeURIComponent(value)} id={`${id()}-${encodeURIComponent(value)}`} label={entries().get(value)?.label ?? ""} disabled={entries().get(value)?.disabled ?? false} selected={selected() === value} />}</For>
    </Primitive.List>
    <For each={[...entries().keys()]}>{value => <div role="tabpanel" id={`${id()}-${encodeURIComponent(value)}-panel`} aria-labelledby={`${id()}-${encodeURIComponent(value)}-tab`} hidden={selected() !== value} inert={selected() !== value} tabIndex={0} class="sheen-tabs-panel">{local.children(value)}</div>}</For>
  </Primitive.Root>;
}
