import { For, Show, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "@gemologic/sheen/core";
import { Input } from "@gemologic/sheen/forms";
import { parseCalendarDate, serializeCalendarDate } from "./calendar-date.ts";
import { createDateTime, dateTimeToWall, resolveWallDateTime, serializeDateTime } from "./date-time.ts";
import { formatDateTime } from "./format.ts";
import { parseTime, serializeTime } from "./time.ts";
import type { CalendarDate, DateTime, DateTimeDisambiguation, DateTimeResolution, Time, TimeZone } from "./types.ts";

// Directives apply only to native elements, never through a component's props.
type NativeInputAttributes = Omit<JSX.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onInput" | "onChange" | "min" | "max" | "step" | "name" | "form" | "children" | "readonly" | "readOnly" | `use:${string}`>;

interface NativeFieldProps<T> extends NativeInputAttributes {
  label: string;
  value?: T | null;
  defaultValue?: T | null;
  onValueChange?: (value: T | null) => void;
  minValue?: T;
  maxValue?: T;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export type NativeDateFieldProps = NativeFieldProps<CalendarDate>;

export interface NativeTimeFieldProps extends NativeFieldProps<Time> {
  granularity?: "minute" | "second";
}

export interface NativeDateTimeFieldProps extends NativeFieldProps<DateTime> {
  /** IANA zone in which the native wall-clock value is entered, displayed, and resolved. */
  timeZone: TimeZone;
  disambiguation?: DateTimeDisambiguation;
  onResolution?: (resolution: DateTimeResolution) => void;
  granularity?: "minute" | "second";
  locale?: string;
}

/** A native value either resolves to a committed value or stays a draft that keeps the last accepted value. */
type Parsed<T> = { readonly kind: "value"; readonly value: T | null } | { readonly kind: "draft"; readonly resolution?: DateTimeResolution };

interface NativeCodec<T> {
  readonly type: "date" | "time" | "datetime-local";
  readonly step: number | undefined;
  native(value: T): string;
  parse(raw: string): Parsed<T>;
  project(value: T): string;
}

function pad(value: number, length = 2): string { return String(value).padStart(length, "0"); }

function nativeTime(value: Time, granularity: "minute" | "second" | undefined): string {
  const minutes = `${pad(value.hour)}:${pad(value.minute)}`;
  if (value.millisecond) return `${minutes}:${pad(value.second)}.${pad(value.millisecond, 3)}`;
  return value.second || granularity === "second" ? `${minutes}:${pad(value.second)}` : minutes;
}

function attempt<T>(read: () => T): Parsed<T> {
  try { return { kind: "value", value: read() }; } catch { return { kind: "draft" }; }
}

function wallParts(raw: string): { readonly date: CalendarDate; readonly time: Time } {
  const [date, time, extra] = raw.split("T");
  if (date === undefined || time === undefined || extra !== undefined) throw new RangeError(`Invalid local date-time ${JSON.stringify(raw)}`);
  return { date: parseCalendarDate(date), time: parseTime(time) };
}

/** Shared ownership for the native fields: controlled/uncontrolled value, ISO projection, reset, and pre-hydration drafts. */
function NativeField<T>(props: NativeFieldProps<T> & { readonly codec: NativeCodec<T>; readonly onDraft?: (parsed: Parsed<T>) => void; readonly bind?: (commit: (value: T | null) => void) => void; readonly extraDescribedBy?: string | undefined }): JSX.Element {
  const [local, others] = splitProps(props, ["codec", "onDraft", "bind", "extraDescribedBy", "value", "defaultValue", "onValueChange", "minValue", "maxValue", "name", "form", "readOnly", "aria-describedby", "ref"]);
  const initial = local.value === undefined ? local.defaultValue ?? null : null;
  const [uncontrolled, setUncontrolled] = createSignal<T | null>(initial);
  const current = (): T | null => local.value === undefined ? uncontrolled() : local.value;
  const nativeValue = (): string => {
    const value = current();
    return value === null ? "" : local.codec.native(value);
  };
  let input: HTMLInputElement | undefined;
  const commit = (value: T | null): void => {
    if (local.value === undefined) setUncontrolled(() => value);
    local.onValueChange?.(value);
    // A controlled owner may reject the proposal; show the accepted value again.
    if (input && input.value !== nativeValue() && local.value !== undefined) input.value = nativeValue();
  };
  local.bind?.(commit);
  const read = (element: HTMLInputElement): void => {
    if (others.disabled || local.readOnly) { element.value = nativeValue(); return; }
    // Chromium reports a partially typed date as "" with badInput; that is a draft, not a clear.
    const parsed: Parsed<T> = element.value === "" && element.validity.badInput ? { kind: "draft" } : element.value === "" ? { kind: "value", value: null } : local.codec.parse(element.value);
    local.onDraft?.(parsed);
    if (parsed.kind === "value" && element.value !== nativeValue()) commit(parsed.value);
  };
  onMount(() => {
    const element = input;
    if (!element) return;
    // Adopt a value typed before hydration without replacing the server input.
    if (element.value !== nativeValue()) read(element);
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    let disposed = false;
    const timers = new Set<number>();
    const reset = (event: Event): void => {
      if (event.target !== element.form) return;
      // Run after the native reset default action has cleared the input.
      const timer = view.setTimeout(() => {
        timers.delete(timer);
        if (disposed || event.defaultPrevented) return;
        local.onDraft?.({ kind: "value", value: initial });
        if (local.value === undefined && uncontrolled() !== initial) commit(initial);
        element.value = nativeValue();
      }, 0);
      timers.add(timer);
    };
    element.ownerDocument.addEventListener("reset", reset, true);
    onCleanup(() => {
      disposed = true;
      for (const timer of timers) view.clearTimeout(timer);
      element.ownerDocument.removeEventListener("reset", reset, true);
    });
  });
  const projection = (): string => {
    const value = current();
    return value === null ? "" : local.codec.project(value);
  };
  const describedBy = (): string | undefined => [local["aria-describedby"], local.extraDescribedBy].filter(Boolean).join(" ") || undefined;
  const setRef = (element: HTMLInputElement): void => {
    input = element;
    const ref = local.ref;
    if (typeof ref === "function") ref(element);
  };
  return <>
    <Input {...others} ref={setRef} type={local.codec.type} value={nativeValue()} readOnly={local.readOnly || undefined}
      min={local.minValue === undefined ? undefined : local.codec.native(local.minValue)} max={local.maxValue === undefined ? undefined : local.codec.native(local.maxValue)}
      step={local.codec.step} aria-describedby={describedBy()} form={local.form}
      onInput={event => read(event.currentTarget)} onChange={event => read(event.currentTarget)} />
    <Show when={local.name !== undefined}><input type="hidden" name={local.name} form={local.form} value={projection()} disabled={others.disabled} /></Show>
  </>;
}

const dateCodec: NativeCodec<CalendarDate> = {
  type: "date", step: undefined,
  native: serializeCalendarDate,
  parse: raw => attempt(() => parseCalendarDate(raw)),
  project: serializeCalendarDate,
};

/** A native `<input type="date">` with a Sheen CalendarDate value and the YYYY-MM-DD form projection. */
export function NativeDateField(props: NativeDateFieldProps): JSX.Element {
  return <NativeField {...props} class={props.class ? `sheen-native-date-field ${props.class}` : "sheen-native-date-field"} codec={dateCodec} />;
}

/** A native `<input type="time">` with a Sheen wall-clock Time value and the HH:mm:ss.SSS form projection. */
export function NativeTimeField(props: NativeTimeFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["granularity", "class"]);
  const codec: NativeCodec<Time> = {
    type: "time",
    get step() { return local.granularity === "second" ? 1 : undefined; },
    native: value => nativeTime(value, local.granularity),
    parse: raw => attempt(() => parseTime(raw)),
    project: serializeTime,
  };
  return <NativeField {...others} class={local.class ? `sheen-native-date-field ${local.class}` : "sheen-native-date-field"} codec={codec} />;
}

/**
 * A native `<input type="datetime-local">` whose wall-clock value is entered in an explicit IANA zone and committed as a Sheen DateTime instant.
 * Repeated or skipped local times follow `disambiguation`; the default `reject` keeps the previous accepted value and offers both instants.
 */
export function NativeDateTimeField(props: NativeDateTimeFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["timeZone", "disambiguation", "onResolution", "granularity", "locale", "class"]);
  const theme = useTheme();
  const id = createUniqueId();
  const [pending, setPending] = createSignal<DateTimeResolution>();
  let commit: ((value: DateTime | null) => void) | undefined;
  const codec: NativeCodec<DateTime> = {
    type: "datetime-local",
    get step() { return local.granularity === "second" ? 1 : undefined; },
    native: value => {
      const wall = dateTimeToWall(createDateTime(value.epochMilliseconds, local.timeZone));
      return `${serializeCalendarDate(wall.date)}T${nativeTime(wall.time, local.granularity)}`;
    },
    parse: raw => {
      let parts: ReturnType<typeof wallParts>;
      try { parts = wallParts(raw); } catch { return { kind: "draft" }; }
      const resolution = resolveWallDateTime({ kind: "wall-date-time", ...parts, timeZone: local.timeZone }, local.disambiguation ?? "reject");
      local.onResolution?.(resolution);
      return resolution.value ? { kind: "value", value: resolution.value } : { kind: "draft", resolution };
    },
    project: serializeDateTime,
  };
  const draft = (parsed: Parsed<DateTime>): void => { setPending(parsed.kind === "draft" ? parsed.resolution : undefined); };
  const choose = (value: DateTime): void => {
    setPending(undefined);
    local.onResolution?.({ kind: "exact", value });
    commit?.(value);
  };
  const choices = (resolution: DateTimeResolution): readonly DateTime[] => resolution.kind === "exact" ? [] : [resolution.earlier, resolution.later];
  const locale = (): string => local.locale ?? theme.state().locale;
  return <div class="sheen-native-date-time-field" data-invalid={pending() !== undefined || undefined}>
    <NativeField {...others} class={local.class ? `sheen-native-date-field ${local.class}` : "sheen-native-date-field"} codec={codec} onDraft={draft}
      aria-invalid={pending() ? true : others["aria-invalid"]} bind={next => { commit = next; }} extraDescribedBy={pending() ? `${id}-resolution` : undefined} />
    <Show when={pending()}>{resolution => <div id={`${id}-resolution`} class="sheen-date-time-resolution" role="alert">
      <p>{resolution().kind === "ambiguous" ? "This local time occurs twice. Choose which instant you mean." : "This local time does not exist because the clock changes. Choose the adjusted instant."}</p>
      <div class="sheen-date-time-resolution-actions">
        <For each={choices(resolution())}>{(choice, index) => <button type="button" class="sheen-date-resolution-button" onClick={() => choose(choice)}>
          {index() === 0 ? "Earlier" : "Later"}: {formatDateTime(choice, locale(), { dateStyle: "medium", timeStyle: "long" })}
        </button>}</For>
      </div>
    </div>}</Show>
  </div>;
}
