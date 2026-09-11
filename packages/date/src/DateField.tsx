import { DateInput as ArkDateInput } from "@ark-ui/solid/date-input";
import { LocaleProvider as ArkLocaleProvider } from "@ark-ui/solid/locale";
import { Show, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { serializeCalendarDate } from "./calendar-date.ts";
import { effectiveLocale, fromDateValue, internalCalendar, stablePlaceholderDate, toDateValue } from "./internal.ts";
import type { CalendarDate } from "./types.ts";

export interface DateFieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate | null) => void;
  placeholderValue?: CalendarDate;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDateUnavailable?: (value: CalendarDate) => boolean;
  locale?: string;
  calendar?: string;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

/** A locale-ordered segmented calendar-date field with an ISO form value. */
export function DateField(props: DateFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "placeholderValue", "minValue", "maxValue", "isDateUnavailable", "locale", "calendar", "name", "form", "description", "error", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const [uncontrolled, setUncontrolled] = createSignal<CalendarDate | null>(local.defaultValue ?? null);
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
  const describedBy = () => [local.description ? `${id()}-description` : "", local.error ? `${id()}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <ArkLocaleProvider locale={theme.state().direction === "rtl" ? "ar" : "en"}><ArkDateInput.Root {...others} id={id()} class={cn("sheen-date-field", local.class)}
    locale={effectiveLocale(local.locale ?? theme.state().locale, local.calendar)} createCalendar={internalCalendar} timeZone="UTC"
    value={internalValue()} placeholderValue={toDateValue(local.placeholderValue ?? current() ?? local.minValue ?? stablePlaceholderDate)}
    min={local.minValue ? toDateValue(local.minValue) : undefined} max={local.maxValue ? toDateValue(local.maxValue) : undefined}
    isDateUnavailable={local.isDateUnavailable ? value => local.isDateUnavailable?.(fromDateValue(value)) ?? false : undefined}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false} invalid={Boolean(local.error)}
    onValueChange={details => change(details.value[0] ? fromDateValue(details.value[0]) : null)}>
    <ArkDateInput.Label asChild={labelProps => <span {...labelProps({ for: undefined })} class="sheen-field-label">
      {local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show>
    </span>} />
    <ArkDateInput.Control class="sheen-date-segment-control">
      <ArkDateInput.SegmentGroup class="sheen-date-segment-group" aria-describedby={describedBy()}>
        <ArkDateInput.SegmentContext>{segment => <ArkDateInput.Segment class="sheen-date-segment" segment={segment} />}</ArkDateInput.SegmentContext>
      </ArkDateInput.SegmentGroup>
    </ArkDateInput.Control>
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={formValue()} disabled={local.disabled} /></Show>
    <Show when={local.description}><span id={`${id()}-description`} class="sheen-field-description">{local.description}</span></Show>
    <Show when={local.error}><span id={`${id()}-error`} class="sheen-field-error">{local.error}</span></Show>
  </ArkDateInput.Root></ArkLocaleProvider>;
}
