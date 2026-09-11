import { compareCalendarDates, readCalendarDate, serializeCalendarDate, parseCalendarDate } from "./calendar-date.ts";
import { isRecord } from "./guards.ts";
import type { CalendarDate, DateRange } from "./types.ts";

export function createDateRange(start: CalendarDate, end: CalendarDate): DateRange {
  const acceptedStart = readCalendarDate(start);
  const acceptedEnd = readCalendarDate(end);
  if (compareCalendarDates(acceptedStart, acceptedEnd) > 0) throw new RangeError("DateRange.start must not be after DateRange.end");
  return Object.freeze({ kind: "date-range", start: acceptedStart, end: acceptedEnd });
}

export function serializeDateRange(value: DateRange): string {
  const range = createDateRange(value.start, value.end);
  return `${serializeCalendarDate(range.start)}/${serializeCalendarDate(range.end)}`;
}

export function parseDateRange(value: string): DateRange {
  const [start, end, extra] = value.split("/");
  if (start === undefined || end === undefined || extra !== undefined) throw new RangeError(`Date range must use YYYY-MM-DD/YYYY-MM-DD, received ${JSON.stringify(value)}`);
  return createDateRange(parseCalendarDate(start), parseCalendarDate(end));
}

export function readDateRange(value: unknown): DateRange {
  if (!isRecord(value) || value.kind !== "date-range") throw new TypeError("Expected a serialized DateRange object");
  return createDateRange(readCalendarDate(value.start), readCalendarDate(value.end));
}
