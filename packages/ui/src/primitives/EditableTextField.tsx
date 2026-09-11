import { Show, createEffect, createSignal, createUniqueId, onCleanup, splitProps, type JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface EditableTextFieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  readonly value: string;
  readonly label: string;
  readonly onCommit: (value: string, signal: AbortSignal) => void | Promise<void>;
  readonly validate?: (value: string) => string | undefined;
  readonly onCommitError?: (error: unknown) => void;
  readonly emptyLabel?: string;
  readonly disabled?: boolean;
}

export function EditableTextField(props: EditableTextFieldProps): JSX.Element {
  const theme = useTheme();
  const [local, rest] = splitProps(props, ["class", "value", "label", "onCommit", "validate", "onCommitError", "emptyLabel", "disabled"]);
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [baseline, setBaseline] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [pending, setPending] = createSignal(false);
  let input: HTMLInputElement | undefined;
  let controller: AbortController | undefined;
  let revision = 0;
  const generatedId = createUniqueId();
  const errorId = () => `${rest.id ?? generatedId}-error`;
  const begin = () => {
    if (local.disabled || editing()) return;
    setBaseline(local.value);
    setDraft(local.value);
    setError(undefined);
    setEditing(true);
  };
  createEffect(() => { if (editing() && input) input.focus({ preventScroll: true }); });
  onCleanup(() => controller?.abort());
  const cancel = () => {
    if (pending()) controller?.abort();
    revision += 1;
    setPending(false);
    setError(undefined);
    setEditing(false);
  };
  const commit = () => {
    if (!editing() || pending()) return;
    const next = draft();
    const validation = local.validate?.(next);
    if (validation) { setError(validation); return; }
    if (next === baseline()) { setEditing(false); setError(undefined); return; }
    controller?.abort();
    controller = new AbortController();
    const token = ++revision;
    let result: void | Promise<void>;
    try { result = local.onCommit(next, controller.signal); }
    catch (failure) {
      setError(theme.messages().editableUpdateFailed);
      local.onCommitError?.(failure);
      return;
    }
    if (!(result instanceof Promise)) { setError(undefined); setEditing(false); return; }
    setPending(true);
    void result.then(() => {
      if (token !== revision || controller?.signal.aborted) return;
      setPending(false);
      setError(undefined);
      setEditing(false);
    }).catch(failure => {
      if (token !== revision || controller?.signal.aborted) return;
      setPending(false);
      setError(theme.messages().editableUpdateFailed);
      local.onCommitError?.(failure);
    });
  };
  return <div {...rest} class={cn("sheen-editable-text", local.class)} data-editing={editing() || undefined}
    data-invalid={error() ? "" : undefined} data-pending={pending() || undefined} data-stale={editing() && local.value !== baseline() ? "" : undefined}>
    <Show when={editing()} fallback={<span tabindex={local.disabled ? undefined : 0} role="button" aria-label={local.label} aria-disabled={local.disabled || undefined}
      onFocus={begin} onClick={begin} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); begin(); } }}>
      {local.value || local.emptyLabel || theme.messages().empty}
    </span>}>
      <input ref={element => { input = element; }} value={draft()} aria-label={local.label} aria-invalid={error() ? true : undefined}
        aria-describedby={error() ? errorId() : undefined} disabled={pending()}
        onInput={event => { setDraft(event.currentTarget.value); setError(undefined); }}
        onBlur={commit} onKeyDown={event => {
          if (event.isComposing || event.key === "Process") return;
          if (event.key === "Enter") { event.preventDefault(); commit(); }
          else if (event.key === "Escape") { event.preventDefault(); cancel(); }
        }} />
    </Show>
    <Show when={error()}>{message => <span id={errorId()} role="alert">{message()}</span>}</Show>
  </div>;
}
