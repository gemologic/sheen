import { For, Show, createSignal, createUniqueId, onCleanup, onMount, splitProps, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { Checkbox } from "./Checkbox.tsx";
import { cn } from "../utils/cn.ts";
import { createChoiceOptions } from "./choice-options.ts";

export interface CheckboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface CheckboxGroupProps extends Omit<JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>, "children" | "onChange"> {
  label: string;
  options: readonly CheckboxOption[];
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  description?: string;
  error?: string;
  readOnly?: boolean;
}

export function CheckboxGroup(props: CheckboxGroupProps): JSX.Element {
  const id = createUniqueId();
  const [local, others] = splitProps(props, ["label", "options", "value", "defaultValue", "onValueChange", "description", "error", "readOnly", "disabled", "name", "class", "ref", "aria-describedby"]);
  const initialValue = [...new Set(local.defaultValue ?? [])];
  const [draft, setDraft] = createSignal(initialValue);
  const value = () => local.value ?? draft();
  let fieldset: HTMLFieldSetElement | undefined;
  const { byValue, keys } = createChoiceOptions(() => local.options, () => fieldset, "CheckboxGroup");
  const change = (next: readonly string[]) => {
    const unique = [...new Set(next)];
    if (unique.length === value().length && unique.every((item, index) => item === value()[index])) return;
    if (local.value === undefined) setDraft(unique);
    local.onValueChange?.([...unique]);
  };
  onMount(() => {
    const element = fieldset;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const pending = new Set<number>();
    const reset = (event: Event) => {
      if (event.target !== element.form) return;
      const task = view.setTimeout(() => {
        pending.delete(task);
        if (!event.defaultPrevented && local.value === undefined) change(initialValue);
      }, 0);
      pending.add(task);
    };
    element.ownerDocument.addEventListener("reset", reset, true);
    onCleanup(() => {
      element.ownerDocument.removeEventListener("reset", reset, true);
      for (const task of pending) view.clearTimeout(task);
    });
  });
  const describedBy = () => [local.description ? `${id}-description` : "", local.error ? `${id}-error` : "", local["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return <fieldset {...others} tabIndex={others.tabIndex ?? -1} ref={element => { fieldset = element; if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-checkbox-group", local.class)} disabled={local.disabled} aria-describedby={describedBy()} aria-invalid={local.error ? true : undefined} data-invalid={local.error ? "true" : undefined} data-readonly={local.readOnly || undefined}>
    <legend class="sheen-checkbox-group-label">{local.label}</legend>
    <Show when={local.description}><p id={`${id}-description`} class="sheen-checkbox-group-description">{local.description}</p></Show>
    <div class="sheen-checkbox-group-options"><For each={keys()}>{key => {
      const initialOption = untrack(() => byValue().get(key));
      if (!initialOption) throw new Error("CheckboxGroup: missing option during creation");
      const option = () => byValue().get(key) ?? initialOption;
      return <Checkbox {...option()} name={local.name ?? ""} form={others.form} checked={value().includes(key)} disabled={!!local.disabled || !!option().disabled} readOnly={local.readOnly ?? false} onCheckedChange={checked => {
        if (local.disabled || local.readOnly || option().disabled) return;
        change(checked ? [...value(), key] : value().filter(item => item !== key));
      }} />;
    }}</For></div>
    <Show when={local.error}><p id={`${id}-error`} class="sheen-checkbox-group-error">{local.error}</p></Show>
  </fieldset>;
}
