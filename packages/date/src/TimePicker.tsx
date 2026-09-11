import { createMemo, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Select, useTheme } from "@gemologic/sheen";
import { formatTime } from "./format.ts";
import { createTime, parseTime, serializeTime } from "./time.ts";
import type { Time } from "./types.ts";

export interface TimePickerOption {
  readonly value: Time;
  readonly label?: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface TimePickerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  value?: Time | null;
  defaultValue?: Time | null;
  onValueChange?: (value: Time | null) => void;
  options?: readonly TimePickerOption[];
  stepMinutes?: number;
  locale?: string;
  hourCycle?: 12 | 24;
  name?: string;
  form?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

function generatedOptions(step: number): TimePickerOption[] {
  if (!Number.isInteger(step) || step < 1 || step > 720) throw new RangeError("TimePicker stepMinutes must be an integer from 1 through 720");
  const result: TimePickerOption[] = [];
  for (let minute = 0; minute < 24 * 60; minute += step) result.push({ value: createTime(Math.floor(minute / 60), minute % 60) });
  return result;
}

/** A scoped searchable-size wall-clock list with deterministic generated intervals. */
export function TimePicker(props: TimePickerProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "value", "defaultValue", "onValueChange", "options", "stepMinutes", "locale", "hourCycle", "name", "form", "placeholder", "description", "error", "required", "disabled", "readOnly"]);
  const theme = useTheme();
  const [uncontrolled, setUncontrolled] = createSignal<Time | null>(local.defaultValue ?? null);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const locale = () => local.locale ?? theme.state().locale;
  const source = createMemo(() => local.options ?? generatedOptions(local.stepMinutes ?? 15));
  const values = createMemo(() => {
    const seen = new Set<string>();
    return source().map(option => {
      const value = serializeTime(option.value);
      if (seen.has(value)) throw new Error(`TimePicker: duplicate option ${JSON.stringify(value)}`);
      seen.add(value);
      return {
        value,
        label: option.label ?? formatTime(option.value, locale(), { hour: "numeric", minute: "2-digit", hourCycle: local.hourCycle === 12 ? "h12" : local.hourCycle === 24 ? "h23" : undefined }),
        ...(option.description === undefined ? {} : { description: option.description }),
        ...(option.disabled === undefined ? {} : { disabled: option.disabled }),
      };
    });
  });
  const change = (value: string | null): void => {
    const next = value === null ? null : parseTime(value);
    if (local.value === undefined) setUncontrolled(next);
    local.onValueChange?.(next);
  };
  const selected = () => {
    const value = current();
    return value === null ? null : serializeTime(value);
  };
  return <Select {...others} label={local.label} options={values()} value={selected()} onValueChange={change}
    {...(local.name === undefined ? {} : { name: local.name })} {...(local.form === undefined ? {} : { form: local.form })}
    {...(local.placeholder === undefined ? {} : { placeholder: local.placeholder })}
    {...(local.description === undefined ? {} : { description: local.description })} {...(local.error === undefined ? {} : { error: local.error })}
    required={local.required ?? false} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} />;
}
