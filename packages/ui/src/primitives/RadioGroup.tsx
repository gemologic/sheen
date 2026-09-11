import { For, Show, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps, untrack } from "solid-js";
import type { JSX } from "solid-js";
import type { CheckboxOption } from "./CheckboxGroup.tsx";
import { createChoiceOptions } from "./choice-options.ts";
import { cn } from "../utils/cn.ts";

export type RadioOption = CheckboxOption;
export interface RadioGroupProps extends Omit<JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>, "children" | "onChange" | "id" | "ref" | "name"> {
  id?: string;
  ref?: HTMLFieldSetElement | ((element: HTMLFieldSetElement) => void);
  name: string;
  label: string;
  options: readonly RadioOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  description?: string;
  error?: string;
  readOnly?: boolean;
  required?: boolean;
  orientation?: "horizontal" | "vertical";
}

export function RadioGroup(props: RadioGroupProps): JSX.Element {
  const generatedId = createUniqueId();
  const [local, others] = splitProps(props, ["id", "ref", "class", "name", "label", "options", "value", "defaultValue", "onValueChange", "description", "error", "disabled", "readOnly", "required", "orientation", "aria-label", "aria-labelledby", "aria-describedby"]);
  const initialValue = local.defaultValue ?? null;
  const [draft, setDraft] = createSignal<string | null>(initialValue);
  const value = () => local.value === undefined ? draft() : local.value;
  let fieldset: HTMLFieldSetElement | undefined;
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const { byValue, keys } = createChoiceOptions(() => {
    if (!local.name.trim()) throw new Error("RadioGroup: name must be nonempty for native grouping");
    if (local.options.some(option => !option.value)) throw new Error("RadioGroup: option values must be nonempty; use null for no selection");
    return local.options;
  }, () => fieldset, "RadioGroup");
  const tabStop = createMemo(() => {
    const selected = value();
    return selected !== null && byValue().has(selected) && !byValue().get(selected)?.disabled ? selected : keys().find(key => !byValue().get(key)?.disabled);
  });
  const change = (next: string | null) => {
    if (next === value()) return;
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  const synchronize = () => {
    if (disposed) return;
    for (const input of fieldset?.querySelectorAll<HTMLInputElement>("input[type=radio]") ?? []) input.checked = input.value === value();
  };
  const requestChange = (next: string) => {
    if (local.disabled || local.readOnly || byValue().get(next)?.disabled) {
      synchronize();
      return;
    }
    change(next || null);
    synchronize();
  };
  onMount(() => {
    const element = fieldset;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const selected = element.querySelector<HTMLInputElement>("input[type=radio]:checked");
    if (!local.disabled && !local.readOnly && selected && !selected.disabled) change(selected.value);
    synchronize();
    const pending = new Set<number>();
    const reset = (event: Event) => {
      if (event.target !== element.form) return;
      const task = view.setTimeout(() => {
        pending.delete(task);
        if (event.defaultPrevented) return;
        if (local.value === undefined) change(initialValue);
        synchronize();
      }, 0);
      pending.add(task);
    };
    element.ownerDocument.addEventListener("reset", reset, true);
    onCleanup(() => {
      element.ownerDocument.removeEventListener("reset", reset, true);
      for (const task of pending) view.clearTimeout(task);
    });
  });
  const describedBy = () => [local.description ? `${generatedId}-description` : "", local.error ? `${generatedId}-error` : "", local["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  return <fieldset role="radiogroup" {...others} {...(local["aria-label"] === undefined ? {} : { "aria-label": local["aria-label"] })} aria-labelledby={local["aria-labelledby"] ?? `${generatedId}-label`} aria-describedby={describedBy()} aria-invalid={local.error ? "true" : undefined} aria-readonly={local.readOnly || undefined} aria-orientation={local.orientation ?? "vertical"} data-invalid={local.error ? "" : undefined} data-readonly={local.readOnly || undefined} id={local.id ?? generatedId} ref={element => { fieldset = element; if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-radio-group", local.class)} disabled={local.disabled ?? false} tabIndex={others.tabIndex ?? -1}>
    <legend id={`${generatedId}-label`} class="sheen-radio-group-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></legend>
    <Show when={local.description}><p id={`${generatedId}-description`} class="sheen-radio-group-description">{local.description}</p></Show>
    <div class="sheen-radio-group-options"><For each={keys()}>{key => {
      const initialOption = untrack(() => byValue().get(key));
      if (!initialOption) throw new Error("RadioGroup: missing option during creation");
      const option = () => byValue().get(key) ?? initialOption;
      const itemId = createUniqueId();
      let input: HTMLInputElement | undefined;
      return <div data-disabled={local.disabled || option().disabled || undefined} class="sheen-radio-item">
        <div class="sheen-radio-row">
          <input ref={input} type="radio" id={`${itemId}-input`} name={local.name} value={key} checked={value() === key} required={local.required} disabled={local.disabled || option().disabled} readOnly={local.readOnly} aria-labelledby={`${itemId}-label`} aria-describedby={[option().description ? `${itemId}-description` : "", describedBy()].filter(Boolean).join(" ") || undefined} form={others.form} class="sheen-radio-input" data-checked={value() === key ? "" : undefined} tabIndex={!local.disabled && tabStop() === key ? 0 : -1} onChange={() => requestChange(key)} />
          <span class="sheen-radio-control" aria-hidden="true" onClick={() => input?.click()}><span class="sheen-radio-indicator" /></span>
          <label id={`${itemId}-label`} for={`${itemId}-input`} class="sheen-radio-label">{option().label}</label>
        </div>
        <Show when={option().description}><p id={`${itemId}-description`} class="sheen-radio-description">{option().description}</p></Show>
      </div>;
    }}</For></div>
    <Show when={local.error}><p id={`${generatedId}-error`} class="sheen-radio-group-error">{local.error}</p></Show>
  </fieldset>;
}
