import { integer, isRecord } from "./guards.ts";
import type { CalendarDate } from "./types.ts";

function pad(value: number, length: number): string { return String(value).padStart(length, "0"); }

export function serializeCalendarDate(value: CalendarDate): string {
  const date = createCalendarDate(value.year, value.month, value.day);
  return `${pad(date.year, 4)}-${pad(date.month, 2)}-${pad(date.day, 2)}`;
}

export function createCalendarDate(year: number, month: number, day: number): CalendarDate {
  integer(year, "CalendarDate.year", 1, 9999);
  integer(month, "CalendarDate.month", 1, 12);
  integer(day, "CalendarDate.day", 1, 31);
  const iso = `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maximumDay = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (maximumDay === undefined || day > maximumDay) throw new RangeError(`Invalid ISO calendar date ${JSON.stringify(iso)}`);
  return Object.freeze({ kind: "calendar-date", year, month, day });
}

export function parseCalendarDate(value: string): CalendarDate {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new RangeError(`Calendar date must use YYYY-MM-DD, received ${JSON.stringify(value)}`);
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) throw new RangeError(`Invalid calendar date ${JSON.stringify(value)}`);
  return createCalendarDate(year, month, day);
}

export function readCalendarDate(value: unknown): CalendarDate {
  if (!isRecord(value) || value.kind !== "calendar-date") throw new TypeError("Expected a serialized CalendarDate object");
  return createCalendarDate(
    integer(value.year, "CalendarDate.year", 1, 9999),
    integer(value.month, "CalendarDate.month", 1, 12),
    integer(value.day, "CalendarDate.day", 1, 31),
  );
}

export function compareCalendarDates(left: CalendarDate, right: CalendarDate): number {
  return serializeCalendarDate(left).localeCompare(serializeCalendarDate(right), "en-US");
}
