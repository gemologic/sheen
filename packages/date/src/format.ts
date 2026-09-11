import { createCalendarDate } from "./calendar-date.ts";
import { dateTimeToWall } from "./date-time.ts";
import { createTime } from "./time.ts";
import type { CalendarDate, DateTime, Time } from "./types.ts";

export type CalendarDateFormatOptions = Omit<Intl.DateTimeFormatOptions, "timeZone">;
export type TimeFormatOptions = Omit<Intl.DateTimeFormatOptions, "timeZone" | "calendar" | "dateStyle">;
export type DateTimeFormatOptions = Intl.DateTimeFormatOptions;

function localeId(locale: string): string {
  if (!locale.trim()) throw new RangeError("An explicit locale is required");
  const canonical = Intl.getCanonicalLocales(locale)[0];
  if (canonical === undefined) throw new RangeError(`Unsupported locale ${JSON.stringify(locale)}`);
  return canonical;
}

export function formatCalendarDate(value: CalendarDate, locale: string, options: CalendarDateFormatOptions = {}): string {
  const date = createCalendarDate(value.year, value.month, value.day);
  const carrier = new Date(0);
  carrier.setUTCFullYear(date.year, date.month - 1, date.day);
  carrier.setUTCHours(0, 0, 0, 0);
  const epoch = carrier.getTime();
  const configured = options.dateStyle !== undefined || options.weekday !== undefined || options.era !== undefined
    || options.year !== undefined || options.month !== undefined || options.day !== undefined;
  return new Intl.DateTimeFormat(localeId(locale), {
    ...(configured ? options : { year: "numeric", month: "short", day: "numeric", ...options }), timeZone: "UTC",
  }).format(epoch);
}

export function formatTime(value: Time, locale: string, options: TimeFormatOptions = {}): string {
  const time = createTime(value.hour, value.minute, value.second, value.millisecond);
  const epoch = Date.UTC(2000, 0, 1, time.hour, time.minute, time.second, time.millisecond);
  const configured = options.timeStyle !== undefined || options.hour !== undefined || options.minute !== undefined
    || options.second !== undefined || options.fractionalSecondDigits !== undefined;
  return new Intl.DateTimeFormat(localeId(locale), {
    ...(configured ? options : { hour: "numeric", minute: "2-digit", ...options }), timeZone: "UTC",
  }).format(epoch);
}

export function formatDateTime(value: DateTime, locale: string, options: DateTimeFormatOptions = {}): string {
  const wall = dateTimeToWall(value);
  const configured = options.dateStyle !== undefined || options.timeStyle !== undefined || options.weekday !== undefined
    || options.era !== undefined || options.year !== undefined || options.month !== undefined || options.day !== undefined
    || options.hour !== undefined || options.minute !== undefined || options.second !== undefined || options.fractionalSecondDigits !== undefined;
  return new Intl.DateTimeFormat(localeId(locale), {
    ...(configured ? options : { dateStyle: "medium", timeStyle: "short", ...options }), timeZone: wall.timeZone.id,
  }).format(value.epochMilliseconds);
}
