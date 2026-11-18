import { createEffect, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { Field } from "./Field.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { createAutoResize } from "../utils/auto-resize.ts";

export interface TextareaProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "children"> {
  label: string;
  description?: string;
  error?: string;
  autoResize?: boolean;
}

export function Textarea(props: TextareaProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["label", "id", "class", "description", "error", "required", "disabled", "aria-describedby", "aria-invalid", "autoResize", "onInput", "ref", "value", "rows"]);
  let element: HTMLTextAreaElement | undefined;
  const schedule = createAutoResize(() => element, () => local.autoResize === true);
  createEffect(() => { void local.value; void local.rows; void local.autoResize; void theme.state(); schedule(); });
  const onInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = event => {
    const handler = local.onInput;
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
    schedule();
  };
  // HTML parsing removes one leading newline from textarea text content.
  const serverText = () => local.value === undefined ? undefined : `\n${local.value}`;
  return <Field label={local.label} controlId={local.id} description={local.description} error={local.error} required={local.required} disabled={local.disabled}>{control =>
    <textarea {...others} {...control} value={isServer ? undefined : local.value} rows={local.rows ?? 3} data-autoresize={local.autoResize || undefined} onInput={onInput} ref={node => { element = node; if (typeof local.ref === "function") local.ref(node); }} aria-describedby={[control["aria-describedby"], local["aria-describedby"]].filter(Boolean).join(" ") || undefined} aria-invalid={local.error ? true : local["aria-invalid"]} class={cn("sheen-input sheen-textarea", local.class)}>{isServer ? serverText() : undefined}</textarea>
  }</Field>;
}
