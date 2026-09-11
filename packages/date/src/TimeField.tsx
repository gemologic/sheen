import { DateInput as ArkDateInput } from "@ark-ui/solid/date-input";
import { LocaleProvider as ArkLocaleProvider } from "@ark-ui/solid/locale";
import { DateFormatter as InternationalizedDateFormatter } from "@internationalized/date";
import { Show, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn, useTheme } from "@gemologic/sheen";
import { effectiveLocale, fromTimeDateValue, toTimeDateValue } from "./internal.ts";
import { serializeTime } from "./time.ts";
import type { Time } from "./types.ts";

export type TimeGranularity = "minute" | "second";

export interface TimeFieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  value?: Time | null;
  defaultValue?: Time | null;
  onValueChange?: (value: Time | null) => void;
  placeholderValue?: Time;
  minValue?: Time;
  maxValue?: Time;
  locale?: string;
  hourCycle?: 12 | 24;
  granularity?: TimeGranularity;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

/** A locale-ordered segmented wall-clock field with an ISO form value. */
export function TimeField(props: TimeFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "placeholderValue", "minValue", "maxValue", "locale", "hourCycle", "granularity", "name", "form", "description", "error", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const [uncontrolled, setUncontrolled] = createSignal<Time | null>(local.defaultValue ?? null);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const internalValue = createMemo(() => {
    const value = current();
    return value === null ? [] : [toTimeDateValue(value)];
  });
  const locale = () => effectiveLocale(local.locale ?? theme.state().locale, undefined);
  const formatter = createMemo(() => new InternationalizedDateFormatter(locale(), {
    hour: "numeric", minute: "2-digit", ...(local.granularity === "second" ? { second: "2-digit" } : {}),
    hourCycle: local.hourCycle === 12 ? "h12" : local.hourCycle === 24 ? "h23" : undefined, timeZone: "UTC",
  }));
  const change = (value: Time | null): void => {
    if (local.disabled || local.readOnly) return;
    if (local.value === undefined) setUncontrolled(value);
    local.onValueChange?.(value);
  };
  const formValue = (): string => {
    const value = current();
    return value === null ? "" : serializeTime(value);
  };
  const describedBy = () => [local.description ? `${id()}-description` : "", local.error ? `${id()}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <ArkLocaleProvider locale={theme.state().direction === "rtl" ? "ar" : "en"}><ArkDateInput.Root {...others} id={id()} class={cn("sheen-time-field", local.class)} locale={locale()} timeZone="UTC"
    value={internalValue()} placeholderValue={toTimeDateValue(local.placeholderValue ?? local.minValue ?? { kind: "time", hour: 0, minute: 0, second: 0, millisecond: 0 })}
    min={local.minValue ? toTimeDateValue(local.minValue) : undefined} max={local.maxValue ? toTimeDateValue(local.maxValue) : undefined}
    formatter={formatter()} granularity={local.granularity ?? "minute"} hourCycle={local.hourCycle}
    disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} required={local.required ?? false} invalid={Boolean(local.error)}
    onValueChange={details => change(details.value[0] ? fromTimeDateValue(details.value[0]) : null)}>
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
