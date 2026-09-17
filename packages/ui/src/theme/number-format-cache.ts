import { createContext } from "solid-js";

type NumberFormatter = (locale: string, options?: Intl.NumberFormatOptions) => Intl.NumberFormat;

// Context identity is shared; formatter instances belong to each provider/request.
export const NumberFormatContext = createContext<NumberFormatter>();

function optionsKey(options: Intl.NumberFormatOptions | undefined): string | undefined {
  if (options === undefined) return "[]";
  if (options === null || typeof options !== "object") return undefined;
  const prototype: unknown = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const entries: string[][] = [];
  for (const name of Object.getOwnPropertyNames(options).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(options, name);
    if (!descriptor || !("value" in descriptor)) return undefined;
    const value: unknown = descriptor.value;
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return undefined;
    entries.push([name, typeof value, Object.is(value, -0) ? "-0" : String(value)]);
  }
  return JSON.stringify(entries);
}

/** Cache plain option records by value; accessors/custom prototypes retain native evaluation. */
export function createNumberFormatCache(): NumberFormatter {
  const formatters = new Map<string, Intl.NumberFormat>();
  return (locale, options) => {
    const key = optionsKey(options);
    if (key === undefined) return new Intl.NumberFormat(locale, options);
    const identity = JSON.stringify([locale, key]);
    const existing = formatters.get(identity);
    if (existing) return existing;
    const formatter = new Intl.NumberFormat(locale, options);
    if (formatters.size >= 32) {
      const oldest = formatters.keys().next().value;
      if (oldest !== undefined) formatters.delete(oldest);
    }
    formatters.set(identity, formatter);
    return formatter;
  };
}
