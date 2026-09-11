import { DatePicker as ArkDatePicker } from "@ark-ui/solid/date-picker";
import { LocaleProvider as ArkLocaleProvider } from "@ark-ui/solid/locale";
import { For, Show, createEffect, createMemo, createSignal, createUniqueId, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { DateValue } from "@internationalized/date";
import { Portal } from "solid-js/web";
import { cn, useTheme } from "@gemologic/sheen";
import { createDateRange, serializeDateRange } from "./date-range.ts";
import { serializeCalendarDate } from "./calendar-date.ts";
import { CalendarViews } from "./CalendarView.tsx";
import { effectiveLocale, fromDateValue, internalCalendar, sameCalendarDate, stablePlaceholderDate, toDateValue } from "./internal.ts";
import type { CalendarDate, DateRange } from "./types.ts";

export interface DatePreset {
  readonly id: string;
  readonly label: string;
  readonly value: CalendarDate;
}

export interface DateRangePreset {
  readonly id: string;
  readonly label: string;
  readonly value: DateRange;
}

interface PickerCommonProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDateUnavailable?: (value: CalendarDate) => boolean;
  defaultVisibleDate?: CalendarDate;
  locale?: string;
  calendar?: string;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export interface DatePickerProps extends PickerCommonProps {
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate | null) => void;
  presets?: readonly DatePreset[];
}

function pickerDescription(id: string, description: string | undefined, error: string | undefined): string | undefined {
  return [description ? `${id}-description` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

function PickerText(props: { readonly id: string; readonly description: string | undefined; readonly error: string | undefined }): JSX.Element {
  return <>
    <Show when={props.description}><span id={`${props.id}-description`} class="sheen-field-description">{props.description}</span></Show>
    <Show when={props.error}><span id={`${props.id}-error`} class="sheen-field-error">{props.error}</span></Show>
  </>;
}

/** A typed calendar-date field and responsive scoped calendar popover. */
export function DatePicker(props: DatePickerProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "presets", "minValue", "maxValue", "isDateUnavailable", "defaultVisibleDate", "locale", "calendar", "name", "form", "description", "error", "placeholder", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const [uncontrolled, setUncontrolled] = createSignal<CalendarDate | null>(local.defaultValue ?? null);
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const internalValue = createMemo(() => {
    const value = current();
    return value === null ? [] : [toDateValue(value)];
  });
  const change = (value: CalendarDate | null): void => {
    if (local.disabled || local.readOnly) return;
    if (local.value === undefined) setUncontrolled(value);
    local.onValueChange?.(value);
  };
  const formValue = (): string => {
    const value = current();
    return value === null ? "" : serializeCalendarDate(value);
  };
  createEffect(() => { if (open()) onCleanup(theme.layers.register(generatedId)); });
  createEffect(() => { if (local.disabled) setOpen(false); });
  return <ArkLocaleProvider locale={theme.state().direction === "rtl" ? "ar" : "en"}><ArkDatePicker.Root {...others} id={id()} class={cn("sheen-date-picker", local.class)} fixedWeeks
    locale={effectiveLocale(local.locale ?? theme.state().locale, local.calendar)} createCalendar={internalCalendar} timeZone="UTC"
    value={internalValue()} defaultFocusedValue={toDateValue(local.defaultVisibleDate ?? current() ?? local.minValue ?? stablePlaceholderDate)}
    min={local.minValue ? toDateValue(local.minValue) : undefined} max={local.maxValue ? toDateValue(local.maxValue) : undefined}
    isDateUnavailable={local.isDateUnavailable ? value => local.isDateUnavailable?.(fromDateValue(value)) ?? false : undefined}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false} invalid={Boolean(local.error)}
    placeholder={local.placeholder} open={open()} onOpenChange={details => setOpen(details.open && !local.disabled)}
    onValueChange={details => change(details.value[0] ? fromDateValue(details.value[0]) : null)} positioning={{ placement: "bottom-start", gutter: 4 }}>
    <ArkDatePicker.Label class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></ArkDatePicker.Label>
    <ArkDatePicker.Control class="sheen-date-picker-control">
      <ArkDatePicker.Input class="sheen-input sheen-date-picker-input" aria-describedby={pickerDescription(id(), local.description, local.error)} />
      <ArkDatePicker.Trigger ref={trigger} class="sheen-date-picker-trigger"><span aria-hidden="true">▦</span><span class="sheen-sr-only">Open calendar</span></ArkDatePicker.Trigger>
      <ArkDatePicker.ClearTrigger class="sheen-date-picker-clear">Clear</ArkDatePicker.ClearTrigger>
    </ArkDatePicker.Control>
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={formValue()} disabled={local.disabled} /></Show>
    <PickerText id={id()} description={local.description} error={local.error} />
    <Show when={theme.portal()}>{target => <Portal mount={target()}>
      <ArkDatePicker.Positioner class="sheen-date-positioner" style={{ "z-index": theme.layers.zIndex(generatedId) }}>
        <ArkDatePicker.Content class="sheen-date-content" data-sheen-date-layer="" onKeyDown={event => {
          if (event.key === "Escape") queueMicrotask(() => trigger?.focus());
        }}>
          <CalendarViews />
          <Show when={local.presets?.length}><div class="sheen-date-presets" aria-label="Date presets">
            <For each={local.presets}>{preset => <ArkDatePicker.PresetTrigger class="sheen-date-preset" aria-label={preset.label} value={[toDateValue(preset.value)]}>{preset.label}</ArkDatePicker.PresetTrigger>}</For>
          </div></Show>
        </ArkDatePicker.Content>
      </ArkDatePicker.Positioner>
    </Portal>}</Show>
  </ArkDatePicker.Root></ArkLocaleProvider>;
}

export interface DateRangePickerProps extends PickerCommonProps {
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | null) => void;
  presets?: readonly DateRangePreset[];
  endLabel?: string;
}

function rangeValues(value: DateRange | null): DateValue[] {
  return value === null ? [] : [toDateValue(value.start), toDateValue(value.end)];
}

function sameRange(left: DateRange | null, right: DateRange | null): boolean {
  return left === right || (left !== null && right !== null && sameCalendarDate(left.start, right.start) && sameCalendarDate(left.end, right.end));
}

/** A two-ended calendar-date picker that retains an incomplete range draft. */
export function DateRangePicker(props: DateRangePickerProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "presets", "endLabel", "minValue", "maxValue", "isDateUnavailable", "defaultVisibleDate", "locale", "calendar", "name", "form", "description", "error", "placeholder", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const initial = local.value ?? local.defaultValue ?? null;
  const [uncontrolled, setUncontrolled] = createSignal<DateRange | null>(initial);
  const [machineValue, setMachineValue] = createSignal(rangeValues(initial));
  const [open, setOpen] = createSignal(false);
  let trigger: HTMLButtonElement | undefined;
  const accepted = () => local.value === undefined ? uncontrolled() : local.value;
  let previousAccepted = accepted();
  createEffect(() => {
    const next = accepted();
    if (!sameRange(previousAccepted, next)) setMachineValue(rangeValues(next));
    previousAccepted = next;
  });
  const commit = (value: DateRange | null): void => {
    if (local.value === undefined) setUncontrolled(value);
    local.onValueChange?.(value);
    if (local.value !== undefined) queueMicrotask(() => setMachineValue(rangeValues(local.value ?? null)));
  };
  const formValue = (): string => {
    const value = accepted();
    return value === null ? "" : serializeDateRange(value);
  };
  createEffect(() => { if (open()) onCleanup(theme.layers.register(generatedId)); });
  createEffect(() => { if (local.disabled) setOpen(false); });
  return <ArkLocaleProvider locale={theme.state().direction === "rtl" ? "ar" : "en"}><ArkDatePicker.Root {...others} id={id()} class={cn("sheen-date-picker sheen-date-range-picker", local.class)} fixedWeeks selectionMode="range" closeOnSelect
    locale={effectiveLocale(local.locale ?? theme.state().locale, local.calendar)} createCalendar={internalCalendar} timeZone="UTC"
    value={machineValue()} defaultFocusedValue={toDateValue(local.defaultVisibleDate ?? accepted()?.start ?? local.minValue ?? stablePlaceholderDate)}
    min={local.minValue ? toDateValue(local.minValue) : undefined} max={local.maxValue ? toDateValue(local.maxValue) : undefined}
    isDateUnavailable={local.isDateUnavailable ? value => local.isDateUnavailable?.(fromDateValue(value)) ?? false : undefined}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false} invalid={Boolean(local.error)}
    placeholder={local.placeholder} open={open()} onOpenChange={details => setOpen(details.open && !local.disabled)}
    onValueChange={details => {
      if (local.disabled || local.readOnly) return;
      setMachineValue(details.value);
      if (details.value.length === 0) commit(null);
      const start = details.value[0];
      const end = details.value[1];
      if (start && end) commit(createDateRange(fromDateValue(start), fromDateValue(end)));
    }} positioning={{ placement: "bottom-start", gutter: 4 }}>
    <ArkDatePicker.Label class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></ArkDatePicker.Label>
    <ArkDatePicker.Control class="sheen-date-picker-control sheen-date-range-control">
      <ArkDatePicker.Input index={0} class="sheen-input sheen-date-picker-input" aria-describedby={pickerDescription(id(), local.description, local.error)} />
      <span aria-hidden="true" class="sheen-date-range-separator">–</span>
      <ArkDatePicker.Input index={1} class="sheen-input sheen-date-picker-input" aria-label={local.endLabel ?? `${local.label}, end`} aria-describedby={pickerDescription(id(), local.description, local.error)} />
      <ArkDatePicker.Trigger ref={trigger} class="sheen-date-picker-trigger"><span aria-hidden="true">▦</span><span class="sheen-sr-only">Open calendar</span></ArkDatePicker.Trigger>
      <ArkDatePicker.ClearTrigger class="sheen-date-picker-clear">Clear</ArkDatePicker.ClearTrigger>
    </ArkDatePicker.Control>
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={formValue()} disabled={local.disabled} /></Show>
    <PickerText id={id()} description={local.description} error={local.error} />
    <Show when={theme.portal()}>{target => <Portal mount={target()}>
      <ArkDatePicker.Positioner class="sheen-date-positioner" style={{ "z-index": theme.layers.zIndex(generatedId) }}>
        <ArkDatePicker.Content class="sheen-date-content" data-sheen-date-layer="" onKeyDown={event => {
          if (event.key === "Escape") queueMicrotask(() => trigger?.focus());
        }}>
          <CalendarViews />
          <Show when={local.presets?.length}><div class="sheen-date-presets" aria-label="Date range presets">
            <For each={local.presets}>{preset => <ArkDatePicker.PresetTrigger class="sheen-date-preset" aria-label={preset.label} value={rangeValues(preset.value)}>{preset.label}</ArkDatePicker.PresetTrigger>}</For>
          </div></Show>
        </ArkDatePicker.Content>
      </ArkDatePicker.Positioner>
    </Portal>}</Show>
  </ArkDatePicker.Root></ArkLocaleProvider>;
}
