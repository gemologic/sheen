import { createMemo } from "solid-js";
import type { JSX } from "solid-js";
import type { SparklineProps } from "./chart-types.ts";

function coordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function sparklinePath(values: Float64Array, width: number, height: number): string {
  if (!(values instanceof Float64Array)) throw new Error("Sparkline values must be a Float64Array");
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (Number.isNaN(value)) continue;
    if (!Number.isFinite(value)) throw new Error(`Sparkline value ${index} must be finite or NaN`);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (min === Number.POSITIVE_INFINITY) return "";
  const inset = Math.min(1, width / 2, height / 2);
  const usableWidth = Math.max(0, width - inset * 2);
  const usableHeight = Math.max(0, height - inset * 2);
  const commands: string[] = [];
  let open = false;
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (Number.isNaN(value)) { open = false; continue; }
    const x = values.length === 1 ? width / 2 : inset + (index / (values.length - 1)) * usableWidth;
    const y = min === max ? height / 2 : inset + ((max - value) / (max - min)) * usableHeight;
    commands.push(`${open ? "L" : "M"}${coordinate(x)} ${coordinate(y)}`);
    open = true;
  }
  return commands.join(" ");
}

export function Sparkline(props: SparklineProps): JSX.Element {
  const render = createMemo(() => {
    const width = props.width ?? 120;
    const height = props.height ?? 28;
    if (!props.label?.trim()) throw new Error("Sparkline requires a nonempty label");
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) throw new Error("Sparkline dimensions must be positive finite numbers");
    return { width, height, path: sparklinePath(props.values, width, height) };
  });
  return <svg class="sheen-sparkline" data-color={props.color ?? "chart-1"}
    width={render().width} height={render().height} viewBox={`0 0 ${render().width} ${render().height}`} role="img" aria-label={props.label} preserveAspectRatio="none">
    <path d={render().path} vector-effect="non-scaling-stroke" />
  </svg>;
}
