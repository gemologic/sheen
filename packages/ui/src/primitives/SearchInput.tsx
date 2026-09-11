import { createSignal, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { InputGroup } from "./InputGroup.tsx";
import type { InputProps } from "./Input.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { useShortcutAction } from "./ShortcutProvider.tsx";
import type { ShortcutAction } from "../utils/shortcut-registry.ts";

export interface SearchInputProps extends Omit<InputProps, "type" | "value"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  clearLabel?: string;
  /** Optional registry-backed shortcut that focuses the search input. */
  shortcut?: ShortcutAction | undefined;
}

export function SearchInput(props: SearchInputProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["value", "defaultValue", "onValueChange", "clearLabel", "shortcut", "onInput", "onCompositionStart", "onCompositionEnd", "ref", "class"]);
  const initialValue = local.defaultValue ?? "";
  const [draft, setDraft] = createSignal(initialValue);
  const value = () => local.value ?? draft();
  const [composition, setComposition] = createSignal<string | undefined>();
  const displayedValue = () => composition() ?? value();
  let input: HTMLInputElement | undefined;
  const update = (next: string) => {
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  const binding = useShortcutAction(() => local.shortcut, () => input?.focus({ preventScroll: true }));
  onMount(() => {
    const element = input;
    if (!element) return;
    if (element.value !== value()) {
      update(element.value);
      if (element.value !== value()) element.value = value();
    }
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    let disposed = false;
    const pending = new Set<number>();
    const reset = (event: Event) => {
      if (event.target !== element.form) return;
      // A microtask can run before the native reset default action finishes.
      const task = view.setTimeout(() => {
        pending.delete(task);
        if (disposed || event.defaultPrevented) return;
        setComposition(undefined);
        if (local.value === undefined && draft() !== initialValue) update(initialValue);
        if (element.value !== value()) element.value = value();
      }, 0);
      pending.add(task);
    };
    element.ownerDocument.addEventListener("reset", reset, true);
    onCleanup(() => {
      disposed = true;
      for (const task of pending) view.clearTimeout(task);
      pending.clear();
      element.ownerDocument.removeEventListener("reset", reset, true);
    });
  });
  const onInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = event => {
    if (event.isComposing || composition() !== undefined) setComposition(event.currentTarget.value);
    update(event.currentTarget.value);
    const handler = local.onInput;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
    if (composition() === undefined && !event.isComposing && event.currentTarget.value !== value()) event.currentTarget.value = value();
  };
  const onCompositionStart: JSX.EventHandler<HTMLInputElement, CompositionEvent> = event => {
    setComposition(event.currentTarget.value);
    const handler = local.onCompositionStart;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
  };
  const onCompositionEnd: JSX.EventHandler<HTMLInputElement, CompositionEvent> = event => {
    const handler = local.onCompositionEnd;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
    setComposition(undefined);
    if (event.currentTarget.value !== value()) event.currentTarget.value = value();
  };
  return <InputGroup {...others} type="search" class={cn("sheen-search-input", local.class)} data-sheen-shortcut={binding()?.displayKeys} value={displayedValue()} onInput={onInput} onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd} ref={element => {
    input = element;
    if (typeof local.ref === "function") local.ref(element);
  }} endContent={<>
    <Button class="sheen-search-input-clear" type="button" disabled={others.disabled || others.readOnly || others.readonly || composition() !== undefined || !value()} onClick={() => {
      if (others.disabled || others.readOnly || others.readonly || composition() !== undefined || !value()) return;
      update("");
      if (input && input.value !== value()) input.value = value();
      input?.focus();
    }}>{local.clearLabel ?? theme.messages().clearSearch}</Button>
    <span class="sheen-search-input-indicator" aria-hidden="true" />
  </>} />;
}
