import * as Primitive from "@kobalte/core/combobox";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { Button } from "./Button.tsx";
import { useShortcutKeyboardOwner } from "./ShortcutProvider.tsx";
import { Tag } from "./Status.tsx";

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export type ComboboxFilter = "contains" | "startsWith" | "endsWith" | false;

interface ComboboxCommonProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  label: string;
  options: readonly ComboboxOption[];
  name?: string;
  form?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  filter?: ComboboxFilter;
  onInputChange?: (value: string) => void;
  pending?: boolean;
  resultsError?: string;
  onRetry?: () => void;
  inputRef?: (element: HTMLInputElement) => void;
}

export interface ComboboxProps extends ComboboxCommonProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}

export interface MultiComboboxProps extends ComboboxCommonProps {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
}

interface OptionSnapshot {
  readonly list: ComboboxOption[];
  readonly map: ReadonlyMap<string, ComboboxOption>;
}

interface AcceptedOptionState {
  readonly snapshot: OptionSnapshot;
  readonly retained: boolean;
}

interface OptionModel {
  readonly state: Accessor<AcceptedOptionState>;
  readonly rootOptions: (selectedValues: readonly string[]) => ComboboxOption[];
  readonly resolve: (value: string, owner: string) => ComboboxOption;
  readonly includesAccepted: (value: string) => boolean;
}

function validateOptions(options: readonly ComboboxOption[], owner: string): OptionSnapshot {
  const map = new Map<string, ComboboxOption>();
  for (const option of options) {
    if (!option.value) throw new Error(`${owner}: option values must be nonempty`);
    if (!option.label.trim()) throw new Error(`${owner}: option labels must be nonempty`);
    if (map.has(option.value)) throw new Error(`${owner}: duplicate option value ${JSON.stringify(option.value)}`);
    map.set(option.value, option);
  }
  return { list: [...map.values()], map };
}

function createOptionModel(options: Accessor<readonly ComboboxOption[]>, pending: Accessor<boolean>, owner: string): OptionModel {
  let accepted: OptionSnapshot | undefined;
  const seen = new Map<string, ComboboxOption>();
  const state = createMemo<AcceptedOptionState>(() => {
    const candidate = validateOptions(options(), owner);
    if (pending() && accepted) return { snapshot: accepted, retained: true };
    accepted = candidate;
    for (const option of candidate.list) seen.set(option.value, option);
    return { snapshot: candidate, retained: false };
  });
  // A pending transition changes status, not the accepted collection. Preserve
  // the snapshot reference so item renderers do not churn merely to show busy UI.
  const snapshot = createMemo(() => state().snapshot);
  const resolve = (value: string, valueOwner: string): ComboboxOption => {
    snapshot();
    const option = seen.get(value);
    if (!option) throw new Error(`${valueOwner}: selected value ${JSON.stringify(value)} has not appeared in options`);
    return option;
  };
  return {
    state,
    resolve,
    includesAccepted: value => snapshot().map.has(value),
    rootOptions(selectedValues) {
      const acceptedSnapshot = snapshot();
      const result = [...acceptedSnapshot.list];
      for (const value of selectedValues) {
        if (!acceptedSnapshot.map.has(value)) result.push(resolve(value, owner));
      }
      return result;
    },
  };
}

function validateValues(values: readonly string[], owner: string): void {
  const unique = new Set<string>();
  for (const value of values) {
    if (!value) throw new Error(`${owner}: selected values must be nonempty`);
    if (unique.has(value)) throw new Error(`${owner}: duplicate selected value ${JSON.stringify(value)}`);
    unique.add(value);
  }
}

function normalized(value: string, locale: string): string {
  return value.normalize("NFKD").replaceAll(/\p{M}/gu, "").toLocaleLowerCase(locale);
}

function optionFilter(model: OptionModel, mode: Accessor<ComboboxFilter>, locale: Accessor<string>): (option: ComboboxOption, input: string) => boolean {
  return (option, input) => {
    if (!model.includesAccepted(option.value)) return false;
    if (mode() === false) return true;
    const candidate = normalized(option.label, locale());
    const query = normalized(input, locale());
    if (mode() === "startsWith") return candidate.startsWith(query);
    if (mode() === "endsWith") return candidate.endsWith(query);
    return candidate.includes(query);
  };
}

function OptionItem(props: Primitive.ComboboxRootItemComponentProps<ComboboxOption>): JSX.Element {
  return <Primitive.Item item={props.item} class="sheen-select-option sheen-combobox-option" onPointerDown={event => {
    // Keep the editable input focused until Kobalte selects on pointer-up. A
    // mouse blur would reset the query and reorder a filtered list under the
    // pointer before the selection event lands.
    if (event.pointerType === "mouse") event.preventDefault();
  }}>
    <Primitive.ItemLabel>{props.item.rawValue.label}</Primitive.ItemLabel>
    <Show when={props.item.rawValue.description}>{description => <Primitive.ItemDescription class="sheen-select-option-description">{description()}</Primitive.ItemDescription>}</Show>
    <Primitive.ItemIndicator class="sheen-select-indicator" aria-hidden="true">✓</Primitive.ItemIndicator>
  </Primitive.Item>;
}

interface ContentProps {
  readonly id: string;
  readonly label: string;
  readonly open: Accessor<boolean>;
  readonly state: Accessor<AcceptedOptionState>;
  readonly pending: Accessor<boolean>;
  readonly resultsError: Accessor<string | undefined>;
  readonly onRetry: Accessor<(() => void) | undefined>;
  readonly setContent: (element: HTMLElement) => void;
}

function OptionsContent(props: ContentProps): JSX.Element {
  const theme = useTheme();
  return <Show when={theme.portal()}>{target => <Primitive.Portal mount={target()}>
    <Primitive.Content ref={props.setContent} data-kb-top-layer="true" aria-hidden={!props.open() || undefined} inert={!props.open()}
      class="sheen-select-content sheen-combobox-content" style={{ "z-index": theme.layers.zIndex(props.id) }}>
      <Primitive.Listbox<ComboboxOption> class="sheen-select-listbox sheen-combobox-listbox" aria-label={`${props.label} Suggestions`} inert={props.pending()} aria-disabled={props.pending() || undefined} />
      <Show when={props.pending()}>
        <p class="sheen-combobox-status" role="status" aria-live="polite">{props.state().retained ? (theme.messages().refreshing ?? theme.messages().loading) : theme.messages().loading}</p>
      </Show>
      <Show when={!props.pending() && !props.state().snapshot.list.length && !props.resultsError()}>
        <p class="sheen-select-empty">{theme.messages().noResults}</p>
      </Show>
      <Show when={props.resultsError()}>{message => <div class="sheen-combobox-results-error" role="alert">
        <span>{message()}</span>
        <Show when={props.onRetry()}>{retry => <Button size="sm" onClick={() => retry()()}>{theme.messages().retry}</Button>}</Show>
      </div>}</Show>
    </Primitive.Content>
  </Primitive.Portal>}</Show>;
}

interface QueryContinuityProps {
  readonly snapshot: Accessor<OptionSnapshot>;
  readonly active: Accessor<boolean>;
  readonly inputValue: Accessor<string>;
}

function QueryContinuity(props: QueryContinuityProps): null {
  const context = Primitive.useComboboxContext();
  let initialized = false;
  createEffect(() => {
    props.snapshot();
    if (!initialized) {
      initialized = true;
      return;
    }
    if (!props.active()) return;
    const value = props.inputValue();
    queueMicrotask(() => { if (props.active()) context.setInputValue(value); });
  });
  return null;
}

interface FieldTextProps {
  readonly id: string;
  readonly description: string | undefined;
  readonly error: string | undefined;
}

function FieldText(props: FieldTextProps): JSX.Element {
  return <>
    <Show when={props.description}><Primitive.Description id={`${props.id}-description`} class="sheen-field-description">{props.description}</Primitive.Description></Show>
    <Show when={props.error}><Primitive.ErrorMessage id={`${props.id}-error`} class="sheen-field-error">{props.error}</Primitive.ErrorMessage></Show>
  </>;
}

function describedBy(id: string, description: string | undefined, error: string | undefined): string | undefined {
  return [description ? `${id}-description` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

/** Editable single selection with app-owned async results and accepted-result continuity. */
export function Combobox(props: ComboboxProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "options", "value", "defaultValue", "onValueChange", "name", "form", "placeholder", "description", "error", "disabled", "readOnly", "required", "filter", "onInputChange", "pending", "resultsError", "onRetry", "inputRef"]);
  const theme = useTheme();
  const id = createUniqueId();
  const initial = local.defaultValue ?? null;
  const [draft, setDraft] = createSignal<string | null>(initial);
  const [open, setOpen] = createSignal(false);
  const [input, setInput] = createSignal<HTMLInputElement>();
  const [content, setContent] = createSignal<HTMLElement>();
  const [inputValue, setInputValue] = createSignal("");
  const [inputDirty, setInputDirty] = createSignal(false);
  let native: HTMLSelectElement | undefined;
  const currentValue = () => local.value === undefined ? draft() : local.value;
  const model = createOptionModel(() => local.options, () => local.pending ?? false, "Combobox");
  const selectedValues = () => {
    const value = currentValue();
    if (value === "") throw new Error("Combobox: selected values must be nonempty");
    return value === null ? [] : [value];
  };
  const selectedOption = () => {
    const value = currentValue();
    if (value === "") throw new Error("Combobox: selected values must be nonempty");
    return value === null ? null : model.resolve(value, "Combobox");
  };
  const rootOptions = createMemo(() => model.rootOptions(selectedValues()));
  const filter = optionFilter(model, () => local.filter ?? "contains", () => theme.state().locale);
  useShortcutKeyboardOwner(input, () => true);
  useShortcutKeyboardOwner(content, open);
  const change = (option: ComboboxOption | null) => {
    if (local.disabled || local.readOnly || local.pending) return;
    const next = option?.value ?? null;
    if (next === currentValue()) return;
    setInputDirty(false);
    if (local.value === undefined) setDraft(next);
    local.onValueChange?.(next);
  };
  const synchronizeNative = () => {
    if (!native) return;
    native.value = currentValue() ?? "";
  };
  createEffect(() => { currentValue(); rootOptions(); synchronizeNative(); });
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
        if (local.value === undefined) change(initial === null ? null : model.resolve(initial, "Combobox defaultValue"));
        synchronizeNative();
      }, 0);
      timers.add(timer);
    };
    document.addEventListener("reset", reset, true);
    onCleanup(() => { document.removeEventListener("reset", reset, true); for (const timer of timers) window.clearTimeout(timer); });
  });
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  return <Primitive.Root<ComboboxOption> {...others} id={local.id ?? `${id}-root`} aria-labelledby={`${id}-label`} multiple={false}
    class={cn("sheen-field sheen-combobox", local.class)} data-previous-results={local.pending && model.state().retained ? "" : undefined}
    options={rootOptions()} optionValue={option => option.value} optionTextValue={option => option.label} optionLabel={option => option.label}
    optionDisabled={option => Boolean(option.disabled)} itemComponent={OptionItem}
    value={selectedOption()} {...(initial ? { defaultValue: model.resolve(initial, "Combobox defaultValue") } : {})} onChange={change}
    defaultFilter={filter} allowsEmptyCollection closeOnSelection disallowEmptySelection={false}
    open={open()} onOpenChange={next => { setOpen(next && !local.disabled); if (!next) setInputDirty(false); }} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false}
    required={local.required ?? false} validationState={local.error ? "invalid" : "valid"} placement="bottom-start" sameWidth gutter={4}>
    <label id={`${id}-label`} for={`${id}-input`} class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></label>
    <Primitive.Control<ComboboxOption> class="sheen-combobox-control">
      <Primitive.Input id={`${id}-input`} aria-labelledby={`${id}-label`} aria-describedby={describedBy(id, local.description, local.error)} ref={element => { setInput(element); local.inputRef?.(element); }} class="sheen-input sheen-combobox-input" placeholder={local.placeholder}
        aria-busy={local.pending || undefined} onInput={() => {
          const value = input()?.value ?? "";
          setInputValue(value);
          setInputDirty(true);
          local.onInputChange?.(value);
        }} />
    </Primitive.Control>
    <select ref={native} id={`${id}-native`} class="sheen-select-native" aria-hidden="true" tabIndex={-1} name={local.name} form={local.form}
      required={local.required} disabled={Boolean(local.disabled || (currentValue() === null && !local.required))} aria-label={local.label}
      onInvalid={event => { event.preventDefault(); input()?.focus(); }} onChange={event => {
        const value = event.currentTarget.value;
        change(value === "" ? null : model.resolve(value, "Combobox native value"));
        synchronizeNative();
      }}>
      <option value=""></option>
      <For each={rootOptions()}>{option => <option value={option.value} disabled={option.disabled} selected={currentValue() === option.value}>{option.label}</option>}</For>
    </select>
    <QueryContinuity snapshot={() => model.state().snapshot} active={() => open() && inputDirty() && input()?.ownerDocument.activeElement === input()} inputValue={inputValue} />
    <FieldText id={id} description={local.description} error={local.error} />
    <OptionsContent id={id} label={local.label} open={open} state={model.state} pending={() => local.pending ?? false} resultsError={() => local.resultsError} onRetry={() => local.onRetry} setContent={setContent} />
  </Primitive.Root>;
}

/** Editable multiple selection with removable tags and app-owned async results. */
export function MultiCombobox(props: MultiComboboxProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "options", "value", "defaultValue", "onValueChange", "name", "form", "placeholder", "description", "error", "disabled", "readOnly", "required", "filter", "onInputChange", "pending", "resultsError", "onRetry", "inputRef"]);
  const theme = useTheme();
  const id = createUniqueId();
  const initial = [...(local.defaultValue ?? [])];
  validateValues(initial, "MultiCombobox defaultValue");
  const [draft, setDraft] = createSignal<readonly string[]>(initial);
  const [open, setOpen] = createSignal(false);
  const [input, setInput] = createSignal<HTMLInputElement>();
  const [content, setContent] = createSignal<HTMLElement>();
  let native: HTMLSelectElement | undefined;
  const currentValues = () => {
    const values = local.value === undefined ? draft() : local.value;
    validateValues(values, "MultiCombobox value");
    return values;
  };
  const model = createOptionModel(() => local.options, () => local.pending ?? false, "MultiCombobox");
  const selectedOptions = createMemo(() => currentValues().map(value => model.resolve(value, "MultiCombobox")));
  const rootOptions = createMemo(() => model.rootOptions(currentValues()));
  const filter = optionFilter(model, () => local.filter ?? "contains", () => theme.state().locale);
  useShortcutKeyboardOwner(input, () => true);
  useShortcutKeyboardOwner(content, open);
  const changeValues = (next: readonly string[]) => {
    if (local.disabled || local.readOnly) return;
    validateValues(next, "MultiCombobox value");
    const current = currentValues();
    if (current.length === next.length && current.every((value, index) => value === next[index])) return;
    if (local.value === undefined) setDraft([...next]);
    local.onValueChange?.([...next]);
  };
  const change = (options: ComboboxOption[]) => {
    if (local.pending) return;
    changeValues(options.map(option => option.value));
  };
  const remove = (value: string) => changeValues(currentValues().filter(candidate => candidate !== value));
  const synchronizeNative = () => {
    if (!native) return;
    const selected = new Set(currentValues());
    for (const option of native.options) option.selected = selected.has(option.value);
  };
  createEffect(() => { currentValues(); rootOptions(); synchronizeNative(); });
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
        if (local.value === undefined) changeValues(initial);
        synchronizeNative();
      }, 0);
      timers.add(timer);
    };
    document.addEventListener("reset", reset, true);
    onCleanup(() => { document.removeEventListener("reset", reset, true); for (const timer of timers) window.clearTimeout(timer); });
  });
  createEffect(() => { if (open()) onCleanup(theme.layers.register(id)); });
  return <Primitive.Root<ComboboxOption> {...others} id={local.id ?? `${id}-root`} aria-labelledby={`${id}-label`} multiple
    class={cn("sheen-field sheen-combobox sheen-multi-combobox", local.class)} data-previous-results={local.pending && model.state().retained ? "" : undefined}
    options={rootOptions()} optionValue={option => option.value} optionTextValue={option => option.label} optionLabel={option => option.label}
    optionDisabled={option => Boolean(local.pending || option.disabled)} itemComponent={OptionItem}
    value={selectedOptions()} defaultValue={initial.map(value => model.resolve(value, "MultiCombobox defaultValue"))} onChange={change}
    defaultFilter={filter} allowsEmptyCollection closeOnSelection={false} removeOnBackspace selectionBehavior="toggle"
    open={open()} onOpenChange={next => setOpen(next && !local.disabled)} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false}
    required={local.required ?? false} validationState={local.error ? "invalid" : "valid"} placement="bottom-start" sameWidth gutter={4}>
    <label id={`${id}-label`} for={`${id}-input`} class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></label>
    <Primitive.Control<ComboboxOption> class="sheen-input sheen-combobox-control sheen-multi-combobox-control">
      <For each={selectedOptions()}>{option => <Tag label={option.label} disabled={Boolean(local.disabled || local.readOnly)} onRemove={() => remove(option.value)} />}</For>
      <Primitive.Input id={`${id}-input`} aria-labelledby={`${id}-label`} aria-describedby={describedBy(id, local.description, local.error)} aria-required={local.required || undefined} required={false}
        ref={element => { setInput(element); local.inputRef?.(element); }} class="sheen-combobox-input sheen-multi-combobox-input" placeholder={!selectedOptions().length ? local.placeholder : undefined}
        aria-busy={local.pending || undefined} onInput={() => local.onInputChange?.(input()?.value ?? "")} />
    </Primitive.Control>
    <select ref={native} class="sheen-select-native" aria-hidden="true" tabIndex={-1} multiple name={local.name} form={local.form}
      required={local.required} disabled={local.disabled} aria-label={local.label}
      onInvalid={event => { event.preventDefault(); input()?.focus(); }} onChange={event => {
        changeValues([...event.currentTarget.selectedOptions].map(option => option.value));
        synchronizeNative();
      }}>
      <For each={rootOptions()}>{option => <option value={option.value} disabled={option.disabled} selected={currentValues().includes(option.value)}>{option.label}</option>}</For>
    </select>
    <FieldText id={id} description={local.description} error={local.error} />
    <OptionsContent id={id} label={local.label} open={open} state={model.state} pending={() => local.pending ?? false} resultsError={() => local.resultsError} onRetry={() => local.onRetry} setContent={setContent} />
  </Primitive.Root>;
}
