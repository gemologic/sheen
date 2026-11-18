import { createMemo } from "solid-js";
import type { JSX } from "solid-js";
import type { BarSparklineProps } from "./chart-types.ts";

function coordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

/** One rectangle subpath per finite value, anchored at zero; NaN leaves an empty slot. */
export function barSparklinePath(values: Float64Array, width: number, height: number): string {
  if (!(values instanceof Float64Array)) throw new Error("BarSparkline values must be a Float64Array");
  let min = 0;
  let max = 0;
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (Number.isNaN(value)) continue;
    if (!Number.isFinite(value)) throw new Error(`BarSparkline value ${index} must be finite or NaN`);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (min === max) max = 1;
  const slot = width / Math.max(1, values.length);
  const bar = Math.max(1, slot - Math.min(2, slot / 3));
  const commands: string[] = [];
  for (let index = 0; index < values.length; index++) {
    const value = values[index]!;
    if (Number.isNaN(value)) continue;
    const top = ((max - Math.max(0, value)) / (max - min)) * height;
    const bottom = ((max - Math.min(0, value)) / (max - min)) * height;
    commands.push(`M${coordinate(index * slot + (slot - bar) / 2)} ${coordinate(top)}h${coordinate(bar)}V${coordinate(Math.max(bottom, top + 1))}h${coordinate(-bar)}Z`);
  }
  return commands.join("");
}

export function BarSparkline(props: BarSparklineProps): JSX.Element {
  const render = createMemo(() => {
    const width = props.width ?? 120;
    const height = props.height ?? 28;
    if (!props.label?.trim()) throw new Error("BarSparkline requires a nonempty label");
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) throw new Error("BarSparkline dimensions must be positive finite numbers");
    return { width, height, path: barSparklinePath(props.values, width, height) };
  });
  return <svg class="sheen-sparkline" data-variant="bar" data-color={props.color ?? "chart-1"}
    width={render().width} height={render().height} viewBox={`0 0 ${render().width} ${render().height}`} role="img" aria-label={props.label} preserveAspectRatio="none">
    <path d={render().path} />
  </svg>;
}
