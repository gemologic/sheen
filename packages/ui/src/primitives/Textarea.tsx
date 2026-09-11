import { createEffect, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { Field } from "./Field.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

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
  let mounted = false;
  let frame: number | undefined;
  let ownedSize = false;
  let originalSize = "";
  const measure = () => {
    frame = undefined;
    if (!element || !mounted) return;
    if (!local.autoResize) {
      if (ownedSize) element.style.blockSize = originalSize;
      ownedSize = false;
      return;
    }
    if (!element.getClientRects().length) return;
    if (!ownedSize) originalSize = element.style.blockSize;
    ownedSize = true;
    element.style.blockSize = "auto";
    element.style.blockSize = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  };
  const schedule = () => {
    if (!mounted || !element || frame !== undefined) return;
    frame = element.ownerDocument.defaultView?.requestAnimationFrame(measure);
  };
  onMount(() => {
    if (!element) return;
    mounted = true;
    const textarea = element;
    let width = -1;
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width;
      if (next !== undefined && next !== width) { width = next; schedule(); }
    });
    observer.observe(textarea);
    const fonts = textarea.ownerDocument.fonts;
    void fonts.ready.then(schedule);
    fonts.addEventListener("loadingdone", schedule);
    const reset = (event: Event) => { if (event.target === textarea.form) schedule(); };
    textarea.ownerDocument.addEventListener("reset", reset, true);
    schedule();
    onCleanup(() => {
      mounted = false;
      observer.disconnect();
      fonts.removeEventListener("loadingdone", schedule);
      textarea.ownerDocument.removeEventListener("reset", reset, true);
      if (frame !== undefined) textarea.ownerDocument.defaultView?.cancelAnimationFrame(frame);
    });
  });
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
