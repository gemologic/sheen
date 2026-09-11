import { Show, children, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Field } from "./Field.tsx";
import type { InputProps } from "./Input.tsx";
import { cn } from "../utils/cn.ts";

export interface InputGroupProps extends InputProps {
  startContent?: JSX.Element;
  endContent?: JSX.Element;
}

export function InputGroup(props: InputGroupProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "id", "class", "description", "error", "required", "disabled", "aria-describedby", "aria-invalid", "startContent", "endContent"]);
  const start = children(() => local.startContent);
  const end = children(() => local.endContent);
  return <Field label={local.label} controlId={local.id} description={local.description} error={local.error} required={local.required} disabled={local.disabled}>{control =>
    <div class="sheen-input-group">
      <Show when={start() != null}><span class="sheen-input-addon">{start()}</span></Show>
      <input {...others} {...control} aria-describedby={[control["aria-describedby"], local["aria-describedby"]].filter(Boolean).join(" ") || undefined} aria-invalid={local.error ? true : local["aria-invalid"]} class={cn("sheen-input", local.class)} />
      <Show when={end() != null}><span class="sheen-input-addon">{end()}</span></Show>
    </div>
  }</Field>;
}
