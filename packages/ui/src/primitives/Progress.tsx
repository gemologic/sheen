import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface ProgressProps extends Omit<JSX.ProgressHTMLAttributes<HTMLProgressElement>, "children" | "max" | "value"> {
  label: string;
  max?: number;
  value?: number;
}

export function Progress(props: ProgressProps): JSX.Element {
  const [local, forwarded] = splitProps(props, ["label", "max", "value", "class"]);
  if (!local.label?.trim()) throw new Error("Progress requires a nonempty label");
  const value = (): number | undefined => {
    const max = local.max ?? 1;
    if (!Number.isFinite(max) || max <= 0) throw new Error("Progress max is invalid");
    if (local.value !== undefined && (!Number.isFinite(local.value) || local.value < 0 || local.value > max)) throw new Error("Progress value is invalid");
    return local.value;
  };
  return <progress {...forwarded} max={local.max} value={value()} class={cn("sheen-progress", local.class)} aria-label={local.label} />;
}

export interface MeterProps extends Omit<JSX.MeterHTMLAttributes<HTMLMeterElement>, "children" | "high" | "low" | "max" | "min" | "optimum" | "value"> {
  label: string;
  value: number;
  min?: number;
  max?: number;
  low?: number;
  high?: number;
  optimum?: number;
}

type MeterState = "optimum" | "suboptimum" | "critical";

function validateThreshold(name: string, value: unknown, min: number, max: number): void {
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)) throw new Error(`Meter ${name} is invalid`);
}

export function Meter(props: MeterProps): JSX.Element {
  const [local, forwarded] = splitProps(props, ["label", "value", "min", "max", "low", "high", "optimum", "class"]);
  if (!local.label?.trim()) throw new Error("Meter requires a nonempty label");
  const measurement = createMemo(() => {
    const min = local.min ?? 0;
    const max = local.max ?? 1;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) throw new Error("Meter range is invalid");
    if (!Number.isFinite(local.value) || local.value < min || local.value > max) throw new Error("Meter value must be finite and within range");
    validateThreshold("low", local.low, min, max);
    validateThreshold("high", local.high, min, max);
    validateThreshold("optimum", local.optimum, min, max);
    if (local.low !== undefined && local.high !== undefined && local.low > local.high) throw new Error("Meter low exceeds high");
    const low = local.low ?? min;
    const high = local.high ?? max;
    const optimum = local.optimum ?? (min + max) / 2;
    let state: MeterState;
    if (optimum < low) state = local.value <= low ? "optimum" : local.value <= high ? "suboptimum" : "critical";
    else if (optimum > high) state = local.value >= high ? "optimum" : local.value >= low ? "suboptimum" : "critical";
    else state = local.value >= low && local.value <= high ? "optimum" : "suboptimum";
    return { value: local.value, state };
  });
  return <meter {...forwarded} value={measurement().value} min={local.min} max={local.max} low={local.low} high={local.high} optimum={local.optimum}
    data-meter-state={measurement().state} class={cn("sheen-meter", local.class)} aria-label={local.label} />;
}
