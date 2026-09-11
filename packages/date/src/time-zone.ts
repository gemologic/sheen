import { isRecord } from "./guards.ts";
import type { TimeZone } from "./types.ts";

export function createTimeZone(id: string): TimeZone {
  if (!id || id.trim() !== id) throw new RangeError("TimeZone.id must be a nonempty IANA identifier without surrounding whitespace");
  try { new Intl.DateTimeFormat("en-US", { timeZone: id }).format(0); }
  catch { throw new RangeError(`Unsupported IANA time zone ${JSON.stringify(id)}`); }
  return Object.freeze({ kind: "time-zone", id });
}

export function readTimeZone(value: unknown): TimeZone {
  if (!isRecord(value) || value.kind !== "time-zone" || typeof value.id !== "string") throw new TypeError("Expected a serialized TimeZone object");
  return createTimeZone(value.id);
}
