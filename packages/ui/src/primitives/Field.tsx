import { Show, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface FieldControlProps {
  readonly id: string;
  readonly "aria-describedby": string | undefined;
  readonly "aria-invalid": true | undefined;
  readonly required: boolean;
  readonly disabled: boolean;
}
export interface FieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  label: string;
  controlId?: string | undefined;
  description?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  children: (control: FieldControlProps) => JSX.Element;
}

export function Field(props: FieldProps): JSX.Element {
  const generatedId = createUniqueId();
  const [local, others] = splitProps(props, ["class", "label", "controlId", "description", "error", "required", "disabled", "children"]);
  const control: FieldControlProps = {
    get id() { return local.controlId ?? generatedId; },
    get "aria-describedby"() { return [local.description ? `${generatedId}-description` : "", local.error ? `${generatedId}-error` : ""].filter(Boolean).join(" ") || undefined; },
    get "aria-invalid"() { return local.error ? true : undefined; },
    get required() { return local.required ?? false; },
    get disabled() { return local.disabled ?? false; },
  };
  return <div {...others} class={cn("sheen-field", local.class)} data-invalid={local.error ? "true" : undefined} data-disabled={local.disabled || undefined}>
    <label class="sheen-field-label" for={control.id}>{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></label>
    {local.children(control)}
    <Show when={local.description}><span class="sheen-field-description" id={`${generatedId}-description`}>{local.description}</span></Show>
    <Show when={local.error}><span class="sheen-field-error" id={`${generatedId}-error`}>{local.error}</span></Show>
  </div>;
}
