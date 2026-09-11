import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";
import { Field } from "./Field.tsx";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export function Input(props: InputProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "id", "class", "description", "error", "required", "disabled", "aria-describedby", "aria-invalid"]);
  return <Field label={local.label} controlId={local.id} description={local.description} error={local.error} required={local.required} disabled={local.disabled}>{control =>
    <input {...others} {...control} aria-describedby={[control["aria-describedby"], local["aria-describedby"]].filter(Boolean).join(" ") || undefined} aria-invalid={local.error ? true : local["aria-invalid"]} class={cn("sheen-input", local.class)} />
  }</Field>;
}
