import { createMemo, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { Combobox } from "@gemologic/sheen";
import { createTimeZone } from "./time-zone.ts";
import type { TimeZone } from "./types.ts";

export interface TimeZoneOption {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface TimeZoneSelectProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  label: string;
  options: readonly TimeZoneOption[];
  value?: TimeZone | null;
  defaultValue?: TimeZone | null;
  onValueChange?: (value: TimeZone | null) => void;
  name?: string;
  form?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  pending?: boolean;
  resultsError?: string;
  onRetry?: () => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

/** An app-bounded IANA-zone combobox that never derives a hydration-sensitive host list. */
export function TimeZoneSelect(props: TimeZoneSelectProps): JSX.Element {
  const [local, others] = splitProps(props, ["label", "options", "value", "defaultValue", "onValueChange", "name", "form", "placeholder", "description", "error", "pending", "resultsError", "onRetry", "required", "disabled", "readOnly"]);
  const [uncontrolled, setUncontrolled] = createSignal<TimeZone | null>(local.defaultValue ?? null);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const options = createMemo(() => local.options.map(option => {
    const zone = createTimeZone(option.id);
    return {
      value: zone.id,
      label: option.label,
      ...(option.description === undefined ? {} : { description: option.description }),
      ...(option.disabled === undefined ? {} : { disabled: option.disabled }),
    };
  }));
  const change = (value: string | null): void => {
    const next = value === null ? null : createTimeZone(value);
    if (local.value === undefined) setUncontrolled(next);
    local.onValueChange?.(next);
  };
  return <Combobox {...others} label={local.label} options={options()} value={current()?.id ?? null} onValueChange={change}
    {...(local.name === undefined ? {} : { name: local.name })} {...(local.form === undefined ? {} : { form: local.form })}
    {...(local.placeholder === undefined ? {} : { placeholder: local.placeholder })}
    {...(local.description === undefined ? {} : { description: local.description })} {...(local.error === undefined ? {} : { error: local.error })}
    {...(local.resultsError === undefined ? {} : { resultsError: local.resultsError })} {...(local.onRetry === undefined ? {} : { onRetry: local.onRetry })}
    pending={local.pending ?? false}
    required={local.required ?? false} disabled={local.disabled ?? false} readOnly={local.readOnly ?? false} />;
}
