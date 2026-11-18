import { Show, children, createEffect, createMemo, createSignal, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { isServer } from "solid-js/web";
import { Button } from "./Button.tsx";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { createAutoResize } from "../utils/auto-resize.ts";

export type PromptInputStatus = "idle" | "streaming";

export interface PromptInputProps extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "children" | "name" | "ref"> {
  ref?: HTMLFormElement | ((element: HTMLFormElement) => void);
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit: (value: string) => void;
  onStop?: () => void;
  status?: PromptInputStatus;
  label?: string;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  maxRows?: number;
  leading?: JSX.Element;
  trailing?: JSX.Element;
  submitLabel?: string;
  stopLabel?: string;
  textareaRef?: (element: HTMLTextAreaElement) => void;
}

/** A chat composer: an auto-growing textarea whose single action sends the draft or stops the streaming response. */
export function PromptInput(props: PromptInputProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["ref", "value", "defaultValue", "onValueChange", "onSubmit", "onStop", "status", "label", "placeholder", "name", "disabled", "maxRows", "leading", "trailing", "submitLabel", "stopLabel", "textareaRef", "class"]);
  const leading = children(() => local.leading);
  const trailing = children(() => local.trailing);
  const [draft, setDraft] = createSignal(local.defaultValue ?? "");
  const value = () => local.value ?? draft();
  const [composing, setComposing] = createSignal(false);
  const streaming = () => local.status === "streaming";
  const maxRows = createMemo(() => {
    const rows = local.maxRows ?? 8;
    if (!Number.isSafeInteger(rows) || rows < 1) throw new Error("PromptInput: maxRows must be a positive integer");
    return rows;
  });
  let textarea: HTMLTextAreaElement | undefined;
  const schedule = createAutoResize(() => textarea, () => true);
  createEffect(() => { void value(); void maxRows(); void theme.state(); schedule(); });
  const update = (next: string) => {
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  // A controlled owner may reject a proposal; restore its value unless an IME draft is still open.
  const reconcile = () => {
    if (textarea && !composing() && textarea.value !== value()) textarea.value = value();
  };
  const canSubmit = () => !local.disabled && !streaming() && !composing() && value().trim().length > 0;
  const canStop = () => !local.disabled && streaming() && local.onStop !== undefined;
  const submit = () => {
    if (!canSubmit()) return;
    const submitted = value();
    if (local.value === undefined) setDraft("");
    local.onSubmit(submitted);
    reconcile();
  };
  onMount(() => {
    // Adopt text typed before hydration attached the input handler.
    if (textarea && textarea.value !== value()) {
      update(textarea.value);
      reconcile();
    }
  });
  const onKeyDown: JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent> = event => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // Enter that confirms an IME candidate belongs to the composition. Safari reports it after compositionend with keyCode 229.
    if (event.isComposing || event.keyCode === 229 || composing()) return;
    event.preventDefault();
    submit();
  };
  const onAction: JSX.EventHandler<HTMLButtonElement, MouseEvent> = event => {
    event.preventDefault();
    if (streaming()) {
      if (canStop()) local.onStop?.();
      return;
    }
    submit();
  };
  const actionLabel = () => streaming() ? local.stopLabel ?? theme.messages().stopResponse : local.submitLabel ?? theme.messages().sendMessage;
  // HTML parsing removes one leading newline from textarea text content.
  const serverText = () => `\n${value()}`;
  return <form {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-prompt-input", local.class)}
    data-status={streaming() ? "streaming" : "idle"} data-disabled={local.disabled || undefined}
    onSubmit={event => { event.preventDefault(); submit(); }}>
    <textarea class="sheen-prompt-input-textarea" rows={1} name={local.name} placeholder={local.placeholder} disabled={local.disabled}
      aria-label={local.label ?? theme.messages().promptInput} value={isServer ? undefined : value()}
      style={{ "--sheen-prompt-input-max-rows": String(maxRows()) }}
      ref={element => { textarea = element; local.textareaRef?.(element); }}
      onInput={event => { update(event.currentTarget.value); reconcile(); schedule(); }}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={() => { setComposing(false); reconcile(); }}
      onKeyDown={onKeyDown}>{isServer ? serverText() : undefined}</textarea>
    <div class="sheen-prompt-input-toolbar">
      <Show when={leading.toArray().length > 0}><div class="sheen-prompt-input-leading">{leading()}</div></Show>
      <div class="sheen-prompt-input-trailing">
        {trailing()}
        <Button class="sheen-prompt-input-action" type={streaming() ? "button" : "submit"} variant="solid" tone={streaming() ? "neutral" : "accent"} size="sm"
          disabled={local.disabled} aria-disabled={!local.disabled && !(streaming() ? canStop() : canSubmit()) ? "true" : undefined}
          aria-label={actionLabel()} data-action={streaming() ? "stop" : "send"} onClick={onAction}>
          <svg class="sheen-prompt-input-glyph" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
            <Show when={streaming()} fallback={<path d="M8 2.5 13 7.5l-1.06 1.06-3.19-3.19V13.5h-1.5V5.37L4.06 8.56 3 7.5z" />}><rect x="4" y="4" width="8" height="8" rx="1.5" /></Show>
          </svg>
        </Button>
      </div>
    </div>
  </form>;
}
