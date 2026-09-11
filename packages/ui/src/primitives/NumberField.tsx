import { createSignal, createUniqueId, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

export interface NumberFieldProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  label: string;
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  largeStep?: number;
  formatOptions?: Intl.NumberFormatOptions;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  inputRef?: HTMLInputElement | ((element: HTMLInputElement) => void);
}

function validateRange(min: number, max: number, step: number, largeStep: number | undefined): void {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error("NumberField min and max must be finite and increasing");
  if (!Number.isFinite(step) || step <= 0) throw new Error("NumberField step must be positive and finite");
  if (largeStep !== undefined && (!Number.isFinite(largeStep) || largeStep <= 0)) throw new Error("NumberField largeStep must be positive and finite");
}

function message(template: string, label: string): string {
  return template.replace("{label}", label);
}

function decimalPlaces(value: number): number {
  const match = value.toString().match(/(?:\.(\d+))?(?:e-([0-9]+))?$/iu);
  return Math.min(12, Math.max(match?.[1]?.length ?? 0, Number(match?.[2] ?? 0)));
}

function stepValue(value: number, offset: number, min: number, max: number, step: number): number {
  const scale = 10 ** Math.max(decimalPlaces(step), decimalPlaces(min));
  const stepped = Math.round((value + offset) * scale) / scale;
  return Math.min(max, Math.max(min, stepped));
}

type ParsedNumber = number | null | undefined;

function createParser(locale: string, options: Intl.NumberFormatOptions | undefined): (value: string) => ParsedNumber {
  const formatter = new Intl.NumberFormat(locale, options);
  const digitFormatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, digit) => digitFormatter.format(digit));
  const removable: string[] = [];
  let decimal = ".", minus = "-", plus = "+";
  for (const part of formatter.formatToParts(-12345.6)) {
    if (part.type === "decimal") decimal = part.value;
    else if (part.type === "minusSign") minus = part.value;
    else if (part.type === "plusSign") plus = part.value;
    else if (part.type !== "integer" && part.type !== "fraction") removable.push(part.value);
  }
  const percent = options?.style === "percent";
  return value => {
    let normalized = value.trim();
    if (!normalized) return null;
    digits.forEach((digit, index) => { normalized = normalized.replaceAll(digit, String(index)); });
    removable.forEach(part => { normalized = normalized.replaceAll(part, ""); });
    normalized = normalized.replaceAll(decimal, ".").replaceAll(minus, "-").replaceAll("−", "-").replaceAll(plus, "+").replaceAll(" ", "");
    if (!normalized || normalized === "-" || normalized === "+" || normalized === "." || normalized === "-." || normalized === "+.") return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed / (percent ? 100 : 1) : undefined;
  };
}

/** A locale-aware spinbutton with numeric app state and raw native form submission. */
export function NumberField(props: NumberFieldProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "value", "defaultValue", "onValueChange", "min", "max", "step", "largeStep", "formatOptions", "name", "form", "description", "error", "disabled", "readOnly", "required", "inputRef"]);
  const theme = useTheme();
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const inputId = () => `${id()}-input`;
  const labelId = () => `${id()}-label`;
  const descriptionId = () => `${id()}-description`;
  const errorId = () => `${id()}-error`;
  const describedBy = (): string | undefined => [local.description ? descriptionId() : undefined, local.error ? errorId() : undefined].filter(value => value !== undefined).join(" ") || undefined;
  const minimum = () => local.min ?? Number.MIN_SAFE_INTEGER;
  const maximum = () => local.max ?? Number.MAX_SAFE_INTEGER;
  const increment = () => local.step ?? 1;
  const formatter = () => new Intl.NumberFormat(theme.state().locale, local.formatOptions);
  const parser = () => createParser(theme.state().locale, local.formatOptions);
  const [uncontrolled, setUncontrolled] = createSignal<number | null>(local.defaultValue ?? null);
  const current = () => local.value === undefined ? uncontrolled() : local.value;
  const formatted = (value: number | null) => value === null ? "" : formatter().format(value);
  const [draft, setDraft] = createSignal(formatted(current()));
  const [focused, setFocused] = createSignal(false);
  let input: HTMLInputElement | undefined;
  let focusedParser: ((value: string) => ParsedNumber) | undefined;
  const validate = (): void => {
    if (!local.label.trim()) throw new Error("NumberField label must be nonempty");
    validateRange(minimum(), maximum(), increment(), local.largeStep);
    for (const [name, value] of [["value", local.value], ["defaultValue", local.defaultValue]] satisfies readonly (readonly [string, number | null | undefined])[]) {
      if (value !== undefined && value !== null && (!Number.isFinite(value) || value < minimum() || value > maximum())) throw new Error(`NumberField ${name} must be finite and within range`);
    }
  };
  validate();
  const displayed = () => focused() ? draft() : formatted(current());
  const publish = (value: number | null, formatDraft: boolean): void => {
    if (local.value === undefined) setUncontrolled(value);
    local.onValueChange?.(value);
    if (formatDraft) setDraft(formatted(current()));
  };
  const accepted = (value: ParsedNumber): value is number | null => value === null ? !local.required : value !== undefined && value >= minimum() && value <= maximum();
  const commitDraft = (): void => {
    const parsed = (focusedParser ?? parser())(draft());
    if (accepted(parsed)) publish(parsed, true);
    else setDraft(formatted(current()));
  };
  const vary = (offset: number): void => {
    if (local.disabled || local.readOnly) return;
    const base = current() ?? Math.min(maximum(), Math.max(minimum(), 0));
    publish(stepValue(base, offset, minimum(), maximum(), increment()), true);
  };
  const assignInput = (element: HTMLInputElement): void => {
    input = element;
    if (typeof local.inputRef === "function") local.inputRef(element);
  };
  onMount(() => {
    if (!input) return;
    const active = input.ownerDocument.activeElement === input;
    setFocused(active);
    if (active) focusedParser = parser();
    if (input.value !== formatted(current())) {
      setDraft(input.value);
      const parsed = parser()(input.value);
      if (accepted(parsed)) publish(parsed, false);
    }
  });
  return <div {...others} id={id()} class={cn("sheen-field sheen-number-field", local.class)} role="group" data-invalid={local.error ? "" : undefined} data-disabled={local.disabled ? "" : undefined}>
    <label id={labelId()} class="sheen-field-label" for={inputId()}>{local.label}{local.required ? <span aria-hidden="true"> *</span> : null}</label>
    <div class="sheen-number-field-control">
      <input ref={assignInput} id={inputId()} class="sheen-input sheen-number-field-input" type="text" role="spinbutton" inputMode="decimal" value={displayed()}
        aria-labelledby={labelId()} aria-describedby={describedBy()} aria-valuemin={minimum()} aria-valuemax={maximum()} aria-valuenow={current() ?? undefined}
        aria-valuetext={current() === null ? undefined : formatted(current())} aria-invalid={local.error ? "true" : undefined} required={local.required}
        disabled={local.disabled} readOnly={local.readOnly} form={local.form}
        onFocus={() => { focusedParser = parser(); setFocused(true); }} onInput={event => {
          setDraft(event.currentTarget.value);
          const parsed = (focusedParser ?? parser())(event.currentTarget.value);
          if (accepted(parsed)) publish(parsed, false);
        }} onBlur={() => { setFocused(false); commitDraft(); focusedParser = undefined; }} onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); commitDraft(); }
          else if (event.key === "Escape") { event.preventDefault(); setDraft(formatted(current())); event.currentTarget.select(); }
          else if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "PageUp" || event.key === "PageDown") {
            if (local.readOnly) return;
            event.preventDefault();
            const amount = event.key.startsWith("Page") ? (local.largeStep ?? increment() * 10) : increment();
            vary(event.key === "ArrowDown" || event.key === "PageDown" ? -amount : amount);
          } else if (event.key === "Home" && !local.readOnly) { event.preventDefault(); publish(minimum(), true); }
          else if (event.key === "End" && !local.readOnly) { event.preventDefault(); publish(maximum(), true); }
        }} />
      <div class="sheen-number-field-steps">
        <button type="button" class="sheen-number-field-step" aria-label={message(theme.messages().decreaseValue, local.label)} disabled={local.disabled || local.readOnly} onClick={() => vary(-increment())}><span aria-hidden="true">−</span></button>
        <button type="button" class="sheen-number-field-step" aria-label={message(theme.messages().increaseValue, local.label)} disabled={local.disabled || local.readOnly} onClick={() => vary(increment())}><span aria-hidden="true">+</span></button>
      </div>
    </div>
    {local.name ? <input type="hidden" name={local.name} form={local.form} value={current() ?? ""} /> : null}
    {local.description ? <p id={descriptionId()} class="sheen-field-description">{local.description}</p> : null}
    {local.error ? <p id={errorId()} class="sheen-field-error">{local.error}</p> : null}
  </div>;
}
