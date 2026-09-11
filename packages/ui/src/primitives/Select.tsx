import * as Primitive from "@kobalte/core/select";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps, untrack } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { useShortcutKeyboardOwner } from "./ShortcutProvider.tsx";

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}
export interface SelectProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  label: string;
  options: readonly SelectOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  name?: string;
  form?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
}

/** Single selection with app-owned values and a contextual listbox. */
export function Select(props: SelectProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "options", "value", "defaultValue", "onValueChange", "name", "form", "placeholder", "description", "error", "disabled", "readOnly", "required"]);
  const theme = useTheme();
  const id = createUniqueId();
  const initial = local.defaultValue ?? null;
  const [draft, setDraft] = createSignal(initial);
  const [open, setOpen] = createSignal(false);
  const value = () => local.value === undefined ? draft() : local.value;
  const [trigger, setTrigger] = createSignal<HTMLButtonElement>();
  const [content, setContent] = createSignal<HTMLElement>();
  useShortcutKeyboardOwner(trigger, () => true);
  useShortcutKeyboardOwner(content, open);
  let native: HTMLSelectElement | undefined;
  let listbox: HTMLUListElement | undefined;
  let disposed = false;
  let refreshingOptions = false;
  onCleanup(() => { disposed = true; });
  const options = createMemo(() => {
    const result = new Map<string, SelectOption>();
    for (const option of local.options) {
      if (!option.value) throw new Error("Select: option values must be nonempty");
      if (result.has(option.value)) throw new Error(`Select: duplicate option value ${JSON.stringify(option.value)}`);
      result.set(option.value, option);
    }
    if (listbox) {
      refreshingOptions = true;
      listbox.ownerDocument.defaultView?.queueMicrotask(() => { refreshingOptions = false; });
    }
    return result;
  });
  let previousKeys: string[] = [];
  const keys = createMemo(() => {
    const next = [...options().keys()];
    const element = listbox;
    const focused = element?.querySelector<HTMLElement>("[role=option]:focus");
    if (element && focused) {
      const key = focused.dataset.key;
      const previousIndex = previousKeys.indexOf(key ?? "");
      element.ownerDocument.defaultView?.queueMicrotask(() => {
        if (disposed || !element.isConnected) return;
        const active = element.ownerDocument.activeElement;
        if (active !== element.ownerDocument.body && active !== focused && active !== element) return;
        const items = [...element.querySelectorAll<HTMLElement>("[role=option]")];
        const eligible = (item: HTMLElement) => item.getAttribute("aria-disabled") !== "true";
        const retained = items.find(item => item.dataset.key === key && eligible(item));
        const index = Math.max(0, previousIndex);
        const nearest = items.slice(index).find(eligible) ?? items.slice(0, index).reverse().find(eligible);
        (retained ?? nearest ?? element).focus({ preventScroll: true });
      });
    }
    previousKeys = next;
    return next;
  });
  const selected = () => options().get(value() ?? "");
  const describedBy = () => [local.description ? `${id}-description` : "", local.error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  const change = (next: string | null) => {
    if (next === value()) return;
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  const requestChange = (next: string | null) => {
    if (refreshingOptions || !next) return;
    if (local.disabled || local.readOnly || (next && options().get(next)?.disabled)) return;
    setOpen(false);
    change(next || null);
  };
  const synchronize = () => { if (native) native.value = selected()?.value ?? ""; };
  createEffect(() => { options(); value(); synchronize(); });
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  createEffect(() => { if (local.disabled) setOpen(false); });
  onMount(() => {
    const document = native?.ownerDocument;
    const window = document?.defaultView;
    if (!document || !window) return;
    const timers = new Set<number>();
    const reset = (event: Event) => {
      if (event.target !== native?.form) return;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (event.defaultPrevented) return;
        if (local.value === undefined) change(initial);
        synchronize();
      }, 0);
      timers.add(timer);
    };
    document.addEventListener("reset", reset, true);
    onCleanup(() => { document.removeEventListener("reset", reset, true); for (const timer of timers) window.clearTimeout(timer); });
  });
  function TriggerButton(buttonProps: JSX.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
    return <button {...buttonProps} aria-labelledby={`${id}-label ${id}-value`} aria-describedby={describedBy()} aria-invalid={local.error ? true : undefined} />;
  }
  return <Primitive.Root<string> {...others} id={local.id ?? `${id}-root`} multiple={false} class={cn("sheen-field sheen-select", local.class)}
    options={keys()} optionValue={key => key} optionTextValue={key => options().get(key)?.label ?? key}
    optionDisabled={key => options().get(key)?.disabled ?? false}
    value={value()} defaultValue={value() ?? ""} onChange={requestChange} closeOnSelection={false} disallowEmptySelection
    open={open()} onOpenChange={next => setOpen(next && !local.disabled)}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false}
    validationState={local.error ? "invalid" : "valid"} placement="bottom-start" sameWidth gutter={4} virtualized>
    <label id={`${id}-label`} for={`${id}-trigger`} class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></label>
    <Primitive.Trigger as={TriggerButton} data-sheen-select-trigger="" id={`${id}-trigger`} ref={setTrigger} form={local.form} class="sheen-input sheen-select-trigger"
      onClick={event => { if (!local.disabled && (!event.currentTarget.dataset.pointerType || event.detail === 0)) setOpen(current => !current); }}>
      <span id={`${id}-value`} data-placeholder={!selected() || undefined}>{selected()?.label ?? local.placeholder ?? theme.messages().selectOption}</span>
      <span aria-hidden="true">▾</span>
    </Primitive.Trigger>
    <select id={`${id}-native`} ref={native} class="sheen-select-native" aria-hidden="true" tabIndex={-1} name={local.name} form={local.form}
      required={local.required} disabled={local.disabled} aria-label={local.label}
      onInvalid={event => { event.preventDefault(); trigger()?.focus(); }} onChange={event => { requestChange(event.currentTarget.value || null); synchronize(); }}>
      <option value="" selected={!selected()} />
      <For each={keys()}>{key => <option value={key} disabled={options().get(key)?.disabled} selected={value() === key}>{options().get(key)?.label}</option>}</For>
    </select>
    <Show when={local.description}><span id={`${id}-description`} class="sheen-field-description">{local.description}</span></Show>
    <Show when={local.error}><span id={`${id}-error`} class="sheen-field-error">{local.error}</span></Show>
    <Show when={theme.portal()}>{target => <Primitive.Portal mount={target()}>
      <Primitive.Content ref={setContent} data-kb-top-layer="true" aria-hidden={!open() || undefined} inert={!open()} class="sheen-select-content" style={{ "z-index": theme.layers.zIndex(id) }}>
        <Primitive.Listbox<string> ref={element => { listbox = element; }} class="sheen-select-listbox" aria-labelledby={`${id}-label`}
          onFocusIn={event => {
            if (event.target !== event.currentTarget) return;
            event.currentTarget.querySelector<HTMLElement>('[role=option][data-highlighted]:not([data-disabled])')?.focus({ preventScroll: true });
          }}
          scrollToItem={key => {
            const item = [...listbox?.querySelectorAll<HTMLElement>("[role=option]") ?? []].find(element => element.dataset.key === key);
            item?.focus({ preventScroll: true });
            item?.scrollIntoView({ block: "nearest", inline: "nearest" });
          }}>
          {collection => <For each={keys()}>{key => {
            // Kobalte's custom-children path is named virtualized. Render every option,
            // keyed by value, so replacement collection records do not remount items.
            const initialItem = untrack(() => collection().getItem(key));
            if (!initialItem) throw new Error(`Select: missing collection item ${JSON.stringify(key)}`);
            return <Primitive.Item item={collection().getItem(key) ?? initialItem} class="sheen-select-option">
              <Primitive.ItemLabel>{options().get(key)?.label}</Primitive.ItemLabel>
              <Show when={options().get(key)?.description}>{description => <Primitive.ItemDescription class="sheen-select-option-description">{description()}</Primitive.ItemDescription>}</Show>
              <Primitive.ItemIndicator class="sheen-select-indicator" aria-hidden="true">✓</Primitive.ItemIndicator>
            </Primitive.Item>;
          }}</For>}
        </Primitive.Listbox>
        <Show when={!keys().length}><p class="sheen-select-empty">{theme.messages().noResults}</p></Show>
      </Primitive.Content>
    </Primitive.Portal>}</Show>
  </Primitive.Root>;
}
