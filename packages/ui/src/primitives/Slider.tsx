import { createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";

interface SharedSliderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  formatOptions?: Intl.NumberFormatOptions;
  name?: string;
  form?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  orientation?: "horizontal" | "vertical";
  inverted?: boolean;
}

export interface SliderProps extends SharedSliderProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueChangeEnd?: (value: number) => void;
}

export interface RangeSliderProps extends SharedSliderProps {
  value?: readonly [number, number];
  defaultValue?: readonly [number, number];
  onValueChange?: (value: readonly [number, number]) => void;
  onValueChangeEnd?: (value: readonly [number, number]) => void;
  minStepsBetweenThumbs?: number;
}

interface SliderFrameProps extends SharedSliderProps {
  readonly values: readonly number[] | undefined;
  readonly defaultValues: readonly number[];
  readonly onChange: (values: readonly number[]) => void;
  readonly onChangeEnd: (values: readonly number[]) => void;
  readonly minStepsBetweenThumbs?: number;
  readonly thumbLabels: readonly string[];
}

function validateRange(label: string, min: number, max: number, step: number, values: readonly number[], minimumSteps: number): void {
  if (!label.trim()) throw new Error("Slider label must be nonempty");
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error("Slider min and max must be finite and increasing");
  if (!Number.isFinite(step) || step <= 0) throw new Error("Slider step must be positive and finite");
  if (!Number.isInteger(minimumSteps) || minimumSteps < 0) throw new Error("RangeSlider minStepsBetweenThumbs must be a nonnegative integer");
  for (const value of values) if (!Number.isFinite(value) || value < min || value > max) throw new Error("Slider values must be finite and within range");
  if (values.length === 2 && values[0] !== undefined && values[1] !== undefined && values[0] > values[1]) throw new Error("RangeSlider values must be increasing");
  if (values.length === 2 && values[0] !== undefined && values[1] !== undefined && values[1] - values[0] < minimumSteps * step) throw new Error("RangeSlider values must satisfy minStepsBetweenThumbs");
}

function pair(values: readonly number[]): readonly [number, number] {
  const first = values[0], second = values[1];
  if (values.length !== 2 || first === undefined || second === undefined) throw new Error("RangeSlider requires exactly two values");
  return [first, second];
}

function message(template: string, label: string): string {
  return template.replace("{label}", label);
}

function SliderFrame(props: SliderFrameProps): JSX.Element {
  const [local, others] = splitProps(props, ["id", "class", "label", "min", "max", "step", "formatOptions", "name", "form", "description", "error", "disabled", "readOnly", "required", "orientation", "inverted", "values", "defaultValues", "onChange", "onChangeEnd", "minStepsBetweenThumbs", "thumbLabels"]);
  const theme = useTheme();
  const min = () => local.min ?? 0;
  const max = () => local.max ?? 100;
  const step = () => local.step ?? 1;
  const minimumSteps = () => local.minStepsBetweenThumbs ?? 0;
  const orientation = () => local.orientation ?? "horizontal";
  const formatter = () => new Intl.NumberFormat(theme.state().locale, local.formatOptions);
  const [uncontrolled, setUncontrolled] = createSignal([...local.defaultValues]);
  const current = (): readonly number[] => local.values ?? uncontrolled();
  validateRange(local.label, min(), max(), step(), current(), minimumSteps());
  const generatedId = createUniqueId();
  const id = () => local.id ?? generatedId;
  const labelId = () => `${id()}-label`;
  const descriptionId = () => `${id()}-description`;
  const errorId = () => `${id()}-error`;
  const describedBy = (): string | undefined => [local.description ? descriptionId() : undefined, local.error ? errorId() : undefined].filter(value => value !== undefined).join(" ") || undefined;
  const position = (value: number): number => {
    const ratio = (value - min()) / (max() - min());
    return (local.inverted ? 1 - ratio : ratio) * 100;
  };
  const bounds = (index: number): readonly [number, number] => {
    const gap = minimumSteps() * step();
    const values = current();
    if (values.length !== 2) return [min(), max()];
    if (index === 0) return [min(), (values[1] ?? max()) - gap];
    return [(values[0] ?? min()) + gap, max()];
  };
  const propose = (index: number, raw: number): readonly number[] => {
    if (local.disabled || local.readOnly || !Number.isFinite(raw)) return current();
    const [low, high] = bounds(index);
    const next = [...current()];
    next[index] = Math.min(high, Math.max(low, raw));
    if (local.values === undefined) setUncontrolled(next);
    local.onChange(next);
    return current();
  };
  const fillStyle = (): string => {
    const positions = current().map(position);
    const start = Math.min(...positions), end = Math.max(...positions);
    if (orientation() === "vertical") return `inset-block-end:${current().length === 1 ? 0 : start}%;block-size:${current().length === 1 ? end : end - start}%`;
    return `inset-inline-start:${current().length === 1 ? 0 : start}%;inline-size:${current().length === 1 ? end : end - start}%`;
  };
  return <div {...others} id={id()} class={cn("sheen-slider", local.class)} role="group" aria-labelledby={labelId()} aria-describedby={describedBy()} aria-invalid={local.error ? "true" : undefined}
    data-orientation={orientation()} data-inverted={local.inverted ? "" : undefined} data-range={current().length === 2 ? "" : undefined}
    data-disabled={local.disabled ? "" : undefined} data-invalid={local.error ? "" : undefined}>
    <div class="sheen-slider-heading">
      <span id={labelId()} class="sheen-slider-label">{local.label}{local.required ? <span aria-hidden="true"> *</span> : null}</span>
      <span class="sheen-slider-value">{current().map(value => formatter().format(value)).join(" – ")}</span>
    </div>
    <div class="sheen-slider-track">
      <span class="sheen-slider-fill" style={fillStyle()} />
      {local.thumbLabels.map((label, index) => <input class="sheen-slider-input" type="range" role="slider" min={min()} max={max()} step={step()} value={current()[index]}
        name={local.name} form={local.form} required={local.required} disabled={local.disabled} aria-label={label} aria-describedby={describedBy()}
        aria-valuemin={bounds(index)[0]} aria-valuemax={bounds(index)[1]} aria-valuenow={current()[index]} aria-valuetext={formatter().format(current()[index] ?? min())}
        aria-orientation={orientation()} aria-readonly={local.readOnly ? "true" : undefined} onInput={event => {
          const accepted = propose(index, event.currentTarget.valueAsNumber);
          event.currentTarget.value = String(accepted[index] ?? min());
        }} onChange={() => local.onChangeEnd(current())} />)}
    </div>
    {local.description ? <p id={descriptionId()} class="sheen-slider-description">{local.description}</p> : null}
    {local.error ? <p id={errorId()} class="sheen-slider-error">{local.error}</p> : null}
  </div>;
}

/** A single-value, locale-formatted slider. */
export function Slider(props: SliderProps): JSX.Element {
  const [local, others] = splitProps(props, ["value", "defaultValue", "onValueChange", "onValueChangeEnd", "label"]);
  const defaultValue = () => local.defaultValue ?? props.min ?? 0;
  const values = (): readonly number[] | undefined => local.value === undefined ? undefined : [local.value];
  return <SliderFrame {...others} label={local.label} values={values()} defaultValues={[defaultValue()]}
    onChange={values => { const value = values[0]; if (value === undefined) throw new Error("Slider requires one value"); local.onValueChange?.(value); }}
    onChangeEnd={values => { const value = values[0]; if (value === undefined) throw new Error("Slider requires one value"); local.onValueChangeEnd?.(value); }}
    thumbLabels={[local.label]} />;
}

/** A two-thumb slider whose ordered tuple cannot silently grow extra values. */
export function RangeSlider(props: RangeSliderProps): JSX.Element {
  const [local, others] = splitProps(props, ["value", "defaultValue", "onValueChange", "onValueChangeEnd", "minStepsBetweenThumbs", "label"]);
  const theme = useTheme();
  const defaultValue = (): readonly [number, number] => local.defaultValue ?? [props.min ?? 0, props.max ?? 100];
  return <SliderFrame {...others} label={local.label} values={local.value} defaultValues={defaultValue()}
    onChange={values => local.onValueChange?.(pair(values))} onChangeEnd={values => local.onValueChangeEnd?.(pair(values))}
    minStepsBetweenThumbs={local.minStepsBetweenThumbs ?? 0}
    thumbLabels={[message(theme.messages().minimumValue, local.label), message(theme.messages().maximumValue, local.label)]} />;
}
