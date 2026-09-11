import type { ChartNumberAxis, ChartTimeAxis, ChartValueAxis } from "./chart-types.ts";

export interface ChartTableFormatters {
  readonly x: (value: number) => string;
  readonly value: (value: number) => string;
}

export type ChartAxisFormatter = (value: number, increment: number) => string;

function numberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    throw new Error(`Chart locale ${locale} or number format is not supported`);
  }
}

function valueOptions(axis?: ChartValueAxis): Intl.NumberFormatOptions | undefined {
  const format = axis?.format;
  if (format === undefined || format === "number") return undefined;
  if (format === "duration") return { style: "unit", unit: "millisecond", unitDisplay: "short" };
  if (format === "percent") return { style: "percent" };
  if (format === "bytes") return { style: "unit", unit: "byte", unitDisplay: "short" };
  if (typeof format === "object" && format !== null && !Array.isArray(format)) return format;
  throw new Error("Chart value format is not supported");
}

function xFormatter(locale: string, axis: ChartTimeAxis | ChartNumberAxis): (value: number) => string {
  if (axis.type === "number") {
    const formatter = numberFormatter(locale, axis.format);
    return value => formatter.format(value);
  }
  if (axis.type !== "time") throw new Error("Chart x axis must be time or number");
  const timeZone = axis.tz ?? "UTC";
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium", timeZone });
  } catch {
    throw new Error(`Chart locale ${locale} or timezone ${timeZone} is not supported`);
  }
  return value => formatter.format(value);
}

export function createChartAxisFormatter(locale: string, axis: ChartTimeAxis | ChartNumberAxis): ChartAxisFormatter {
  if (typeof locale !== "string" || !locale.trim()) throw new Error("Chart locale must be nonempty");
  if (axis.type === "number") {
    const formatter = numberFormatter(locale, axis.format);
    return value => formatter.format(value);
  }
  if (axis.type !== "time") throw new Error("Chart x axis must be time or number");
  const timeZone = axis.tz ?? "UTC";
  const formatters = new Map<string, Intl.DateTimeFormat>();
  return (value, increment) => {
    const key = increment >= 86_400_000 ? "day" : increment >= 3_600_000 ? "hour" : increment >= 60_000 ? "minute" : "second";
    let formatter = formatters.get(key);
    if (!formatter) {
      const options: Intl.DateTimeFormatOptions = key === "day"
        ? { month: "short", day: "numeric", timeZone }
        : key === "hour"
          ? { month: "short", day: "numeric", hour: "numeric", timeZone }
          : key === "minute"
            ? { hour: "numeric", minute: "2-digit", timeZone }
            : { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone };
      try {
        formatter = new Intl.DateTimeFormat(locale, options);
      } catch {
        throw new Error(`Chart locale ${locale} or timezone ${timeZone} is not supported`);
      }
      formatters.set(key, formatter);
    }
    return formatter.format(value);
  };
}

export function createChartTableFormatters(locale: string, x: ChartTimeAxis | ChartNumberAxis, y?: ChartValueAxis): ChartTableFormatters {
  if (typeof locale !== "string" || !locale.trim()) throw new Error("Chart locale must be nonempty");
  if (typeof x !== "object" || x === null) throw new Error("Chart x axis is required");
  if (y !== undefined && (typeof y !== "object" || y === null || Array.isArray(y))) throw new Error("Chart y axis must be an object");
  const values = numberFormatter(locale, valueOptions(y));
  return Object.freeze({ x: xFormatter(locale, x), value: (value: number) => values.format(value) });
}
