import { For, Show, createEffect, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "@gemologic/sheen";
import { changeDateTimeZone, dateTimeToWall, resolveWallDateTime, serializeDateTime } from "./date-time.ts";
import { formatDateTime } from "./format.ts";
import { stablePlaceholderDate } from "./internal.ts";
import { createTimeZone } from "./time-zone.ts";
import { createTime } from "./time.ts";
import { DatePicker } from "./DatePicker.tsx";
import { TimeField } from "./TimeField.tsx";
import { TimeZoneSelect } from "./TimeZoneSelect.tsx";
import type { TimeZoneOption } from "./TimeZoneSelect.tsx";
import type { CalendarDate, DateTime, DateTimeDisambiguation, DateTimeResolution, Time, TimeZone, TimeZoneChangeBehavior } from "./types.ts";

export interface DateTimePickerProps extends Omit<JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>, "onChange"> {
  label: string;
  value?: DateTime | null;
  defaultValue?: DateTime | null;
  onValueChange?: (value: DateTime | null) => void;
  onResolution?: (resolution: DateTimeResolution) => void;
  timeZoneOptions: readonly TimeZoneOption[];
  timeZonePending?: boolean;
  timeZoneError?: string;
  onTimeZoneRetry?: () => void;
  defaultTimeZone?: TimeZone;
  defaultDate?: CalendarDate;
  defaultTime?: Time;
  disambiguation?: DateTimeDisambiguation;
  timeZoneChangeBehavior?: TimeZoneChangeBehavior;
  locale?: string;
  calendar?: string;
  hourCycle?: 12 | 24;
  granularity?: "minute" | "second";
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  dateLabel?: string;
  timeLabel?: string;
  timeZoneLabel?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

function resolutionChoices(resolution: DateTimeResolution): readonly DateTime[] {
  return resolution.kind === "exact" ? [] : [resolution.earlier, resolution.later];
}

/** An instant editor with explicit wall-time, zone-change, and DST resolution semantics. */
export function DateTimePicker(props: DateTimePickerProps): JSX.Element {
  const [local, others] = splitProps(props, ["class", "label", "value", "defaultValue", "onValueChange", "onResolution", "timeZoneOptions", "timeZonePending", "timeZoneError", "onTimeZoneRetry", "defaultTimeZone", "defaultDate", "defaultTime", "disambiguation", "timeZoneChangeBehavior", "locale", "calendar", "hourCycle", "granularity", "name", "form", "description", "error", "dateLabel", "timeLabel", "timeZoneLabel", "required", "disabled", "readOnly"]);
  const initial = local.value ?? local.defaultValue ?? null;
  const id = createUniqueId();
  const initialWall = initial === null ? null : dateTimeToWall(initial);
  const [uncontrolled, setUncontrolled] = createSignal<DateTime | null>(initial);
  const [draftDate, setDraftDate] = createSignal<CalendarDate | null>(initialWall?.date ?? null);
  const [draftTime, setDraftTime] = createSignal<Time | null>(initialWall?.time ?? null);
  const [draftZone, setDraftZone] = createSignal<TimeZone>(initialWall?.timeZone ?? local.defaultTimeZone ?? createTimeZone("UTC"));
  const [pending, setPending] = createSignal<DateTimeResolution>();
  const [dirty, setDirty] = createSignal(false);
  const [stale, setStale] = createSignal(false);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  let lastExternalKey = initial === null ? "" : serializeDateTime(initial);
  let lastRequestedKey = lastExternalKey;

  const synchronize = (value: DateTime | null): void => {
    if (value === null) {
      setDraftDate(null);
      setDraftTime(null);
      setDraftZone(local.defaultTimeZone ?? createTimeZone("UTC"));
    } else {
      const wall = dateTimeToWall(value);
      setDraftDate(wall.date);
      setDraftTime(wall.time);
      setDraftZone(wall.timeZone);
    }
    setPending(undefined);
    setStale(false);
  };

  createEffect(() => {
    const value = current();
    const key = value === null ? "" : serializeDateTime(value);
    if (key === lastExternalKey) return;
    if (dirty() && key !== lastRequestedKey) setStale(true);
    else {
      synchronize(value);
      if (key === lastRequestedKey) setDirty(false);
    }
    lastExternalKey = key;
  });

  const request = (value: DateTime | null): void => {
    lastRequestedKey = value === null ? "" : serializeDateTime(value);
    if (local.value === undefined) setUncontrolled(value);
    local.onValueChange?.(value);
  };

  const resolveDraft = (date: CalendarDate | null, time: Time | null, zone: TimeZone): void => {
    setDirty(true);
    setPending(undefined);
    if (date === null || time === null) return;
    const resolution = resolveWallDateTime({ kind: "wall-date-time", date, time, timeZone: zone }, local.disambiguation ?? "reject");
    local.onResolution?.(resolution);
    if (resolution.value) request(resolution.value);
    else setPending(resolution);
  };

  const changeDate = (date: CalendarDate | null): void => {
    setDraftDate(date);
    resolveDraft(date, draftTime(), draftZone());
    if (date === null && draftTime() === null) request(null);
  };
  const changeTime = (time: Time | null): void => {
    setDraftTime(time);
    resolveDraft(draftDate(), time, draftZone());
    if (time === null && draftDate() === null) request(null);
  };
  const changeZone = (zone: TimeZone | null): void => {
    if (zone === null) return;
    const accepted = current();
    if ((local.timeZoneChangeBehavior ?? "preserve-instant") === "preserve-instant" && accepted !== null && !dirty()) {
      const resolution = changeDateTimeZone(accepted, zone, "preserve-instant");
      setDraftZone(zone);
      local.onResolution?.(resolution);
      if (resolution.kind !== "exact") throw new Error("Preserving an instant must resolve exactly");
      request(resolution.value);
      return;
    }
    setDraftZone(zone);
    resolveDraft(draftDate(), draftTime(), zone);
  };
  const choose = (value: DateTime): void => {
    local.onResolution?.({ kind: "exact", value });
    request(value);
    synchronize(value);
    const accepted = current();
    setDirty(accepted === null || serializeDateTime(accepted) !== serializeDateTime(value));
  };
  const resolutionMessage = () => pending()?.kind === "ambiguous"
    ? "This local time occurs twice. Choose which instant you mean."
    : "This local time does not exist because the clock changes. Choose the adjusted instant.";
  const describedBy = () => [local.description ? `${id}-description` : "", local.error ? `${id}-error` : "", pending() ? `${id}-resolution` : ""].filter(Boolean).join(" ") || undefined;
  const selectedDate = () => draftDate() ?? local.defaultDate ?? stablePlaceholderDate;
  const selectedTime = () => draftTime() ?? local.defaultTime ?? createTime(0, 0);
  const formValue = (): string => {
    const value = current();
    return value === null ? "" : serializeDateTime(value);
  };
  return <fieldset {...others} class={cn("sheen-date-time-picker", local.class)}
    disabled={local.disabled} aria-describedby={describedBy()} data-invalid={Boolean(local.error) || pending() !== undefined || undefined} data-stale={stale() || undefined}>
    <legend class="sheen-field-label">{local.label}<Show when={local.required}><span aria-hidden="true"> *</span></Show></legend>
    <div class="sheen-date-time-grid">
      <DatePicker label={local.dateLabel ?? "Date"} value={draftDate()} defaultVisibleDate={selectedDate()} onValueChange={changeDate}
        {...(local.locale === undefined ? {} : { locale: local.locale })} {...(local.calendar === undefined ? {} : { calendar: local.calendar })}
        required={local.required ?? false} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} />
      <TimeField label={local.timeLabel ?? "Time"} value={draftTime()} placeholderValue={selectedTime()} onValueChange={changeTime}
        {...(local.locale === undefined ? {} : { locale: local.locale })} {...(local.hourCycle === undefined ? {} : { hourCycle: local.hourCycle })}
        {...(local.granularity === undefined ? {} : { granularity: local.granularity })}
        required={local.required ?? false} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} />
      <TimeZoneSelect label={local.timeZoneLabel ?? "Time zone"} options={local.timeZoneOptions} value={draftZone()} onValueChange={changeZone}
        pending={local.timeZonePending ?? false} {...(local.timeZoneError === undefined ? {} : { resultsError: local.timeZoneError })}
        {...(local.onTimeZoneRetry === undefined ? {} : { onRetry: local.onTimeZoneRetry })}
        required={local.required ?? false} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} />
    </div>
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={formValue()} disabled={local.disabled} /></Show>
    <Show when={local.description}><span id={`${id}-description`} class="sheen-field-description">{local.description}</span></Show>
    <Show when={local.error}><span id={`${id}-error`} class="sheen-field-error">{local.error}</span></Show>
    <Show when={pending()}>{resolution => <div id={`${id}-resolution`} class="sheen-date-time-resolution" role="alert">
      <p>{resolutionMessage()}</p>
      <div class="sheen-date-time-resolution-actions">
        <For each={resolutionChoices(resolution())}>{(choice, index) => <button type="button" class="sheen-date-resolution-button" onClick={() => choose(choice)}>
          {index() === 0 ? "Earlier" : "Later"}: {formatDateTime(choice, local.locale ?? "en-US", { dateStyle: "medium", timeStyle: "long" })}
        </button>}</For>
      </div>
    </div>}</Show>
    <Show when={stale()}><p class="sheen-date-time-stale" role="status">The accepted value changed while this draft was being edited. Your draft was retained.</p></Show>
  </fieldset>;
}
