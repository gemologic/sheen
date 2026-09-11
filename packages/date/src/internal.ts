import { CalendarDate as InternationalizedCalendarDate, CalendarDateTime as InternationalizedCalendarDateTime, createCalendar as createInternationalizedCalendar } from "@internationalized/date";
import type { CalendarIdentifier, Calendar, DateValue } from "@internationalized/date";
import { createCalendarDate } from "./calendar-date.ts";
import { createTime } from "./time.ts";
import type { CalendarDate, Time } from "./types.ts";

export const stablePlaceholderDate = Object.freeze(createCalendarDate(2000, 1, 1));

export function effectiveLocale(locale: string, calendar: string | undefined): string {
  const canonical = Intl.getCanonicalLocales(locale)[0];
  if (canonical === undefined) throw new RangeError(`Unsupported locale ${JSON.stringify(locale)}`);
  if (calendar === undefined) return canonical;
  if (!calendar.trim()) throw new RangeError("Calendar identifiers must be nonempty");
  return new Intl.Locale(canonical, { calendar }).toString();
}

export function internalCalendar(identifier: CalendarIdentifier): Calendar {
  return createInternationalizedCalendar(identifier);
}

export function toDateValue(value: CalendarDate): InternationalizedCalendarDate {
  const date = createCalendarDate(value.year, value.month, value.day);
  return new InternationalizedCalendarDate(date.year, date.month, date.day);
}

export function fromDateValue(value: DateValue): CalendarDate {
  return createCalendarDate(value.year, value.month, value.day);
}

export function toTimeDateValue(value: Time): InternationalizedCalendarDateTime {
  const time = createTime(value.hour, value.minute, value.second, value.millisecond);
  return new InternationalizedCalendarDateTime(2000, 1, 1, time.hour, time.minute, time.second, time.millisecond);
}

export function fromTimeDateValue(value: DateValue): Time {
  if (!("hour" in value)) throw new TypeError("Expected a date value with time fields");
  return createTime(value.hour, value.minute, value.second, value.millisecond);
}

export function sameCalendarDate(left: CalendarDate | null, right: CalendarDate | null): boolean {
  return left === right || (left !== null && right !== null && left.year === right.year && left.month === right.month && left.day === right.day);
}

export function sameTime(left: Time | null, right: Time | null): boolean {
  return left === right || (left !== null && right !== null && left.hour === right.hour && left.minute === right.minute
    && left.second === right.second && left.millisecond === right.millisecond);
}
