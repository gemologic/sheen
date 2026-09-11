import { For, Show, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { createChoiceOptions } from "./choice-options.ts";

export interface SegmentedControlOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps extends Omit<JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>, "children" | "onChange" | "id" | "ref" | "name"> {
  id?: string;
  ref?: HTMLFieldSetElement | ((element: HTMLFieldSetElement) => void);
  name: string;
  label: string;
  options: readonly SegmentedControlOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  description?: string;
  error?: string;
  readOnly?: boolean;
  required?: boolean;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md";
  overflowBehavior?: "scroll" | "wrap";
}

/** A compact, native-radio single-selection control with roving focus. */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element {
  const generatedId = createUniqueId();
  const [local, others] = splitProps(props, ["id", "ref", "class", "name", "label", "options", "value", "defaultValue", "onValueChange", "description", "error", "disabled", "readOnly", "required", "orientation", "size", "overflowBehavior", "form", "aria-label", "aria-labelledby", "aria-describedby"]);
  const initialValue = local.defaultValue ?? null;
  const [uncontrolled, setUncontrolled] = createSignal<string | null>(initialValue);
  const value = () => local.value === undefined ? uncontrolled() : local.value;
  let fieldset: HTMLFieldSetElement | undefined;
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const { byValue, keys } = createChoiceOptions(() => {
    if (!local.name.trim()) throw new Error("SegmentedControl: name must be nonempty for native form submission");
    for (const option of local.options) {
      if (!option.value.trim()) throw new Error("SegmentedControl: option values must be nonempty; use null for no selection");
      if (!option.label.trim()) throw new Error(`SegmentedControl: option ${JSON.stringify(option.value)} must have a nonempty label`);
    }
    return local.options;
  }, () => fieldset, "SegmentedControl");
  const tabStop = createMemo(() => {
    const selected = value();
    if (selected !== null && !byValue().get(selected)?.disabled) return selected;
    return keys().find(key => !byValue().get(key)?.disabled);
  });
  const change = (next: string | null): void => {
    if (next === value()) return;
    if (local.value === undefined) setUncontrolled(next);
    local.onValueChange?.(next);
  };
  const synchronize = (): void => {
    if (disposed) return;
    for (const input of fieldset?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? []) input.checked = input.value === value();
  };
  const requestChange = (next: string): void => {
    if (local.disabled || local.readOnly || byValue().get(next)?.disabled) {
      synchronize();
      return;
    }
    change(next);
    synchronize();
  };
  const moveFocus = (event: KeyboardEvent & { currentTarget: HTMLInputElement }, destination: "first" | "last" | 1 | -1): void => {
    const root = fieldset;
    if (!root || local.disabled) return;
    const inputs = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(input => !input.disabled);
    if (inputs.length === 0) return;
    const current = Math.max(0, inputs.indexOf(event.currentTarget));
    const target = destination === "first" ? inputs[0] : destination === "last" ? inputs.at(-1) : inputs[(current + destination + inputs.length) % inputs.length];
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (!local.readOnly) target.click();
  };
  const onKeyDown = (event: KeyboardEvent & { currentTarget: HTMLInputElement }): void => {
    if (event.key === "Home") moveFocus(event, "first");
    else if (event.key === "End") moveFocus(event, "last");
    else if (event.key === "ArrowUp") moveFocus(event, -1);
    else if (event.key === "ArrowDown") moveFocus(event, 1);
    else if (event.key === "ArrowLeft") moveFocus(event, event.currentTarget.closest('[dir="rtl"]') ? 1 : -1);
    else if (event.key === "ArrowRight") moveFocus(event, event.currentTarget.closest('[dir="rtl"]') ? -1 : 1);
  };
  onMount(() => {
    const element = fieldset;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    const selected = element.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    if (!local.disabled && !local.readOnly && selected && !selected.disabled) change(selected.value);
    synchronize();
    const pending = new Set<number>();
    const reset = (event: Event): void => {
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
  return <fieldset role="radiogroup" {...others} {...(local["aria-label"] === undefined ? {} : { "aria-label": local["aria-label"] })}
    id={local.id ?? generatedId} ref={element => { fieldset = element; if (typeof local.ref === "function") local.ref(element); }} form={local.form}
    class={cn("sheen-segmented-control", local.class)} aria-labelledby={local["aria-labelledby"] ?? `${generatedId}-label`} aria-describedby={describedBy()}
    aria-invalid={local.error ? "true" : undefined} aria-readonly={local.readOnly || undefined} aria-orientation={local.orientation ?? "horizontal"}
    data-invalid={local.error ? "" : undefined} data-readonly={local.readOnly || undefined} data-size={local.size ?? "sm"}
    data-overflow={local.overflowBehavior ?? "scroll"} disabled={local.disabled ?? false}>
    <legend id={`${generatedId}-label`} class="sheen-segmented-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></legend>
    <Show when={local.description}><p id={`${generatedId}-description`} class="sheen-segmented-description">{local.description}</p></Show>
    <div class="sheen-segmented-options"><For each={keys()}>{key => {
      const initialOption = untrack(() => byValue().get(key));
      if (!initialOption) throw new Error("SegmentedControl: missing option during creation");
      const option = () => byValue().get(key) ?? initialOption;
      const itemId = createUniqueId();
      return <label class="sheen-segmented-item" data-disabled={local.disabled || option().disabled || undefined}>
        <input type="radio" class="sheen-segmented-input" id={`${itemId}-input`} name={local.name} form={local.form} value={key}
          checked={value() === key} required={local.required} disabled={local.disabled || option().disabled} readOnly={local.readOnly}
          aria-labelledby={`${itemId}-label`} aria-describedby={describedBy()}
          tabIndex={!local.disabled && tabStop() === key ? 0 : -1} onKeyDown={onKeyDown} onClick={event => { if (local.readOnly) event.preventDefault(); }}
          onChange={() => requestChange(key)} />
        <span id={`${itemId}-label`} class="sheen-segmented-item-label">{option().label}</span>
      </label>;
    }}</For></div>
    <Show when={local.error}><p id={`${generatedId}-error`} class="sheen-segmented-error">{local.error}</p></Show>
  </fieldset>;
}
