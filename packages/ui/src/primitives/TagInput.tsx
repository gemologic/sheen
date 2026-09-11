import { For, Show, createEffect, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { Button } from "./Button.tsx";

export interface TagInputValidationContext {
  readonly values: readonly string[];
}

export type TagInputValidationResult =
  | { readonly kind: "accepted"; readonly value?: string }
  | { readonly kind: "rejected"; readonly message: string };

export interface TagInputProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange" | "onInput" | "ref"> {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  inputRef?: HTMLInputElement | ((element: HTMLInputElement) => void);
  label: string;
  name?: string;
  form?: string;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
  validate?: (candidate: string, context: TagInputValidationContext, signal: AbortSignal) => TagInputValidationResult | Promise<TagInputValidationResult>;
  onValidationError?: (error: unknown) => void;
  normalize?: (draft: string) => string;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  commitKeys?: readonly string[];
}

function validateValues(values: readonly string[], owner: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value.trim()) throw new Error(`${owner}: values must be nonempty`);
    if (seen.has(value)) throw new Error(`${owner}: duplicate value ${JSON.stringify(value)}`);
    seen.add(value);
  }
}

function sameValues(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

/** An ordered free-form tag editor with native multi-value form projection. */
export function TagInput(props: TagInputProps): JSX.Element {
  const theme = useTheme();
  const generatedId = createUniqueId();
  const [local, others] = splitProps(props, ["id", "ref", "inputRef", "class", "label", "name", "form", "value", "defaultValue", "onValueChange", "validate", "onValidationError", "normalize", "placeholder", "description", "error", "disabled", "readOnly", "required", "commitKeys", "aria-describedby", "aria-label", "aria-labelledby"]);
  const initial = [...(local.defaultValue ?? [])];
  validateValues(initial, "TagInput defaultValue");
  const [uncontrolled, setUncontrolled] = createSignal<readonly string[]>(initial);
  const [draft, setDraft] = createSignal("");
  const [composition, setComposition] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [validationError, setValidationError] = createSignal<string>();
  const [announcement, setAnnouncement] = createSignal("");
  let input: HTMLInputElement | undefined;
  let native: HTMLSelectElement | undefined;
  let disposed = false;
  let validationRevision = 0;
  let validationController: AbortController | undefined;
  const removeButtons = new Map<string, HTMLButtonElement>();
  const values = (): readonly string[] => {
    const result = local.value === undefined ? uncontrolled() : local.value;
    validateValues(result, "TagInput value");
    return result;
  };
  const describedBy = () => [local.description ? `${generatedId}-description` : "", local.error || validationError() ? `${generatedId}-error` : "", local["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const publish = (next: readonly string[]): void => {
    validateValues(next, "TagInput value");
    if (sameValues(next, values())) return;
    if (local.value === undefined) setUncontrolled([...next]);
    local.onValueChange?.([...next]);
  };
  const cancelValidation = (): void => {
    validationRevision += 1;
    validationController?.abort();
    validationController = undefined;
    setPending(false);
  };
  const setInputValue = (next: string): void => {
    if (next !== draft()) setDraft(next);
    if (input && input.value !== next) input.value = next;
  };
  const announce = (template: string, value: string): void => {
    setAnnouncement("");
    queueMicrotask(() => { if (!disposed) setAnnouncement(template.replaceAll("{value}", value)); });
  };
  const remove = (value: string, restoreFocus: boolean): void => {
    if (local.disabled || local.readOnly) return;
    const current = values();
    const index = current.indexOf(value);
    if (index < 0) return;
    cancelValidation();
    publish(current.filter(candidate => candidate !== value));
    announce(theme.messages().tagRemoved, value);
    if (restoreFocus) queueMicrotask(() => {
      const next = values()[Math.min(index, Math.max(0, values().length - 1))];
      if (next) removeButtons.get(next)?.focus({ preventScroll: true });
      else input?.focus({ preventScroll: true });
    });
  };
  const move = (value: string, destination: number): void => {
    if (local.disabled || local.readOnly) return;
    const current = [...values()];
    const from = current.indexOf(value);
    if (from < 0) return;
    const to = Math.max(0, Math.min(current.length - 1, destination));
    if (from === to) return;
    cancelValidation();
    current.splice(from, 1);
    current.splice(to, 0, value);
    publish(current);
    announce(theme.messages().tagMoved, value);
    queueMicrotask(() => removeButtons.get(value)?.focus({ preventScroll: true }));
  };
  const commit = async (): Promise<void> => {
    if (local.disabled || local.readOnly || pending()) return;
    const candidate = (local.normalize ?? (value => value.trim()))(draft());
    if (!candidate) return;
    if (values().includes(candidate)) {
      setValidationError(theme.messages().tagDuplicate.replaceAll("{value}", candidate));
      return;
    }
    setValidationError(undefined);
    const revision = validationRevision + 1;
    validationRevision = revision;
    validationController?.abort();
    const controller = new AbortController();
    validationController = controller;
    setPending(true);
    try {
      const result = local.validate
        ? await local.validate(candidate, { values: [...values()] }, controller.signal)
        : { kind: "accepted" } satisfies TagInputValidationResult;
      if (disposed || controller.signal.aborted || revision !== validationRevision) return;
      if (result.kind === "rejected") {
        setValidationError(result.message);
        return;
      }
      const accepted = result.value === undefined ? candidate : result.value;
      if (!accepted.trim()) {
        setValidationError(theme.messages().tagValidationFailed);
        return;
      }
      if (values().includes(accepted)) {
        setValidationError(theme.messages().tagDuplicate.replaceAll("{value}", accepted));
        return;
      }
      publish([...values(), accepted]);
      setInputValue("");
      announce(theme.messages().tagAdded, accepted);
    } catch (error: unknown) {
      if (disposed || controller.signal.aborted || revision !== validationRevision) return;
      setValidationError(theme.messages().tagValidationFailed);
      local.onValidationError?.(error);
    } finally {
      if (!disposed && revision === validationRevision) {
        validationController = undefined;
        setPending(false);
      }
    }
  };
  const onInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = event => {
    cancelValidation();
    setValidationError(undefined);
    setDraft(event.currentTarget.value);
  };
  const onKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = event => {
    if (event.isComposing || composition()) return;
    const keys = local.commitKeys ?? ["Enter", ","];
    if (keys.includes(event.key)) {
      if (draft().trim()) event.preventDefault();
      void commit();
      return;
    }
    if (event.key === "Backspace" && !draft() && values().length > 0) {
      const last = values().at(-1);
      if (last) remove(last, false);
    } else if (event.key === "ArrowLeft" && !draft()) {
      const last = values().at(-1);
      if (last) {
        event.preventDefault();
        removeButtons.get(last)?.focus({ preventScroll: true });
      }
    }
  };
  const onTagKeyDown = (event: KeyboardEvent & { currentTarget: HTMLButtonElement }, value: string): void => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(value, true);
      return;
    }
    if (!event.altKey) return;
    const index = values().indexOf(value);
    if (index < 0) return;
    const rtl = Boolean(event.currentTarget.closest('[dir="rtl"]'));
    if (event.key === "Home") {
      event.preventDefault();
      move(value, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      move(value, values().length - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(value, index + (rtl ? 1 : -1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(value, index + (rtl ? -1 : 1));
    }
  };
  const synchronizeNative = (): void => {
    if (!native) return;
    const selected = new Set(values());
    for (const option of native.options) option.selected = selected.has(option.value);
  };
  createEffect(() => { values(); synchronizeNative(); });
  onMount(() => {
    const element = input;
    const document = element?.ownerDocument;
    const view = document?.defaultView;
    if (!element || !document || !view) return;
    if (element.value !== draft()) setDraft(element.value);
    const timers = new Set<number>();
    const reset = (event: Event): void => {
      if (event.target !== native?.form && event.target !== element.form) return;
      const timer = view.setTimeout(() => {
        timers.delete(timer);
        if (disposed || event.defaultPrevented) return;
        cancelValidation();
        setValidationError(undefined);
        setInputValue("");
        if (local.value === undefined) publish(initial);
        synchronizeNative();
      }, 0);
      timers.add(timer);
    };
    document.addEventListener("reset", reset, true);
    onCleanup(() => {
      document.removeEventListener("reset", reset, true);
      for (const timer of timers) view.clearTimeout(timer);
    });
  });
  onCleanup(() => {
    disposed = true;
    validationRevision += 1;
    validationController?.abort();
  });
  const visibleError = () => local.error ?? validationError();
  return <div {...others} id={local.id ?? generatedId} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-field sheen-tag-input", local.class)}
    data-invalid={visibleError() ? "true" : undefined} data-disabled={local.disabled || undefined} data-readonly={local.readOnly || undefined} data-pending={pending() || undefined}>
    <label id={`${generatedId}-label`} for={`${generatedId}-input`} class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></label>
    <div class="sheen-tag-input-control" onClick={event => { if (event.target === event.currentTarget) input?.focus(); }}>
      <ul class="sheen-tag-input-values" aria-label={theme.messages().tagValues}><For each={values()}>{value => {
        onCleanup(() => removeButtons.delete(value));
        return <li class="sheen-tag-input-value" data-tag-value={value}>
          <span class="sheen-tag-input-value-label">{value}</span>
          <Button ref={element => removeButtons.set(value, element)} class="sheen-tag-input-remove" size="xs" disabled={local.disabled} aria-disabled={local.readOnly || undefined} aria-label={`${theme.messages().remove} ${value}`}
            aria-describedby={`${generatedId}-reorder`} onKeyDown={event => onTagKeyDown(event, value)} onClick={() => remove(value, true)}>{theme.messages().remove}</Button>
        </li>;
      }}</For></ul>
      <input id={`${generatedId}-input`} ref={element => { input = element; if (typeof local.inputRef === "function") local.inputRef(element); }} type="text" class="sheen-tag-input-editor"
        value={draft()} placeholder={values().length === 0 ? local.placeholder : undefined} disabled={local.disabled} readOnly={local.readOnly} autocomplete="off"
        aria-label={local["aria-label"]} aria-labelledby={local["aria-labelledby"] ?? `${generatedId}-label`} aria-describedby={describedBy()} aria-invalid={visibleError() ? true : undefined}
        aria-required={local.required || undefined} aria-busy={pending() || undefined} onInput={onInput} onKeyDown={onKeyDown}
        onCompositionStart={() => setComposition(true)} onCompositionEnd={event => { setComposition(false); setDraft(event.currentTarget.value); }} />
    </div>
    <select ref={native} class="sheen-select-native" aria-hidden="true" tabIndex={-1} multiple name={local.name} form={local.form} required={local.required} disabled={local.disabled} aria-label={local.label}
      onInvalid={event => { event.preventDefault(); input?.focus(); }} onChange={event => { if (!local.readOnly) publish([...event.currentTarget.selectedOptions].map(option => option.value)); synchronizeNative(); }}>
      <For each={values()}>{value => <option value={value} selected>{value}</option>}</For>
    </select>
    <span id={`${generatedId}-reorder`} class="sheen-tag-input-instructions">{theme.messages().tagReorderInstructions}</span>
    <Show when={local.description}><span id={`${generatedId}-description`} class="sheen-field-description">{local.description}</span></Show>
    <Show when={visibleError()}>{message => <span id={`${generatedId}-error`} class="sheen-field-error" role="alert">{message()}</span>}</Show>
    <span class="sheen-tag-input-announcer" role="status" aria-live="polite" aria-atomic="true">{pending() ? theme.messages().tagValidating : announcement()}</span>
  </div>;
}
