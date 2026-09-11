import { Show, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { createBooleanInputState } from "./boolean-input-state.ts";

export interface CheckboxProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange" | "id" | "ref" | "onPointerDown"> {
  id?: string;
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  onPointerDown?: NonNullable<JSX.HTMLAttributes<HTMLDivElement>["onPointerDown"]>;
  label: string;
  description?: string;
  error?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string | undefined;
  value?: string;
  inputRef?: (element: HTMLInputElement) => void;
}

export function createNativeBooleanControl(props: CheckboxProps, kind: "checkbox" | "switch"): JSX.Element {
  const [local, state, others] = splitProps(props,
    ["label", "description", "error", "class", "onCheckedChange", "inputRef", "form"],
    ["checked", "defaultChecked", "indeterminate", "disabled", "readOnly", "required", "name", "value"]);
  const prefix = `sheen-${kind}`;
  const generatedId = createUniqueId();
  const inputId = `${generatedId}-input`;
  let input: HTMLInputElement | undefined;
  const describedBy = () => [local.description ? `${generatedId}-description` : "", local.error ? `${generatedId}-error` : ""].filter(Boolean).join(" ") || undefined;
  const { checked, requestChange, setInput } = createBooleanInputState(state, next => local.onCheckedChange?.(next));
  return <div {...others} class={cn(prefix, local.class)} data-checked={checked() || undefined} data-indeterminate={state.indeterminate || undefined} data-disabled={state.disabled || undefined} data-readonly={state.readOnly || undefined} data-invalid={local.error ? "" : undefined}>
    <div class={`${prefix}-row`}>
      <input id={inputId} type="checkbox" role={kind === "switch" ? "switch" : undefined} name={state.name ?? ""} value={state.value} form={local.form} disabled={state.disabled} required={state.required} readOnly={state.readOnly} checked={checked()} aria-readonly={state.readOnly || undefined} aria-invalid={local.error ? "true" : undefined} aria-describedby={describedBy()} class={`${prefix}-input`} ref={element => { input = element; setInput(element); local.inputRef?.(element); }} onChange={event => requestChange(event.currentTarget)} />
      <span class={`${prefix}-control`} data-indeterminate={state.indeterminate || undefined} aria-hidden="true" onClick={() => input?.click()}>
        {kind === "checkbox" ? <span class="sheen-checkbox-indicator"><span class="sheen-checkbox-mark" /></span> : <span class="sheen-switch-thumb" />}
      </span>
      <label for={inputId} class={`${prefix}-label`}>{local.label}<Show when={state.required}><span aria-hidden="true"> *</span></Show></label>
    </div>
    <Show when={local.description}><p id={`${generatedId}-description`} class={`${prefix}-description`}>{local.description}</p></Show>
    <Show when={local.error}><p id={`${generatedId}-error`} class={`${prefix}-error`}>{local.error}</p></Show>
  </div>;
}

export function Checkbox(props: CheckboxProps): JSX.Element {
  return createNativeBooleanControl(props, "checkbox");
}
