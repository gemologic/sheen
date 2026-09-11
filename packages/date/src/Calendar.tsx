import { DatePicker as ArkDatePicker } from "@ark-ui/solid/date-picker";
import { LocaleProvider as ArkLocaleProvider } from "@ark-ui/solid/locale";
import { Show, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { serializeCalendarDate } from "./calendar-date.ts";
import { CalendarViews } from "./CalendarView.tsx";
import { effectiveLocale, fromDateValue, internalCalendar, stablePlaceholderDate, toDateValue } from "./internal.ts";
import type { CalendarDate } from "./types.ts";

export interface CalendarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  value?: CalendarDate | null;
  defaultValue?: CalendarDate | null;
  onValueChange?: (value: CalendarDate | null) => void;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  isDateUnavailable?: (value: CalendarDate) => boolean;
  defaultVisibleDate?: CalendarDate;
  locale?: string;
  calendar?: string;
  name?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

/** An always-visible, locale-aware calendar with stable server markup. */
export function Calendar(props: CalendarProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "minValue", "maxValue", "isDateUnavailable", "defaultVisibleDate", "locale", "calendar", "name", "form", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const [uncontrolled, setUncontrolled] = createSignal<CalendarDate | null>(local.defaultValue ?? null);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const locale = () => effectiveLocale(local.locale ?? theme.state().locale, local.calendar);
  const internalValue = createMemo(() => {
    const value = current();
    return value === null ? [] : [toDateValue(value)];
  });
  const change = (next: CalendarDate | null): void => {
    if (local.disabled || local.readOnly) return;
    if (local.value === undefined) setUncontrolled(next);
    local.onValueChange?.(next);
  };
  const formValue = (): string => {
    const value = current();
    return value === null ? "" : serializeCalendarDate(value);
  };
  return <ArkLocaleProvider locale={theme.state().direction === "rtl" ? "ar" : "en"}><ArkDatePicker.Root {...others} id={local.id ?? generatedId} class={cn("sheen-calendar", local.class)} inline fixedWeeks
    aria-required={local.required || undefined} locale={locale()} createCalendar={internalCalendar} timeZone="UTC"
    value={internalValue()} defaultFocusedValue={toDateValue(local.defaultVisibleDate ?? current() ?? local.minValue ?? stablePlaceholderDate)}
    min={local.minValue ? toDateValue(local.minValue) : undefined} max={local.maxValue ? toDateValue(local.maxValue) : undefined}
    isDateUnavailable={local.isDateUnavailable ? value => local.isDateUnavailable?.(fromDateValue(value)) ?? false : undefined}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false}
    onValueChange={details => change(details.value[0] ? fromDateValue(details.value[0]) : null)}>
    <ArkDatePicker.Label asChild={labelProps => <span {...labelProps({ for: undefined })} class="sheen-calendar-label">
      {local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show>
    </span>} />
    <CalendarViews />
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={formValue()} disabled={local.disabled} /></Show>
  </ArkDatePicker.Root></ArkLocaleProvider>;
}
