import { CalendarDateTime as InternationalizedCalendarDateTime, fromAbsolute } from "@internationalized/date";
import { createCalendarDate } from "./calendar-date.ts";
import { isRecord } from "./guards.ts";
import { createTime } from "./time.ts";
import { createTimeZone, readTimeZone } from "./time-zone.ts";
import type { CalendarDate, DateTime, DateTimeDisambiguation, DateTimeResolution, Time, TimeZone, TimeZoneChangeBehavior, WallDateTime } from "./types.ts";

function epochMilliseconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || !Number.isFinite(value)) throw new RangeError("DateTime.epochMilliseconds must be a finite safe integer");
  return value;
}

export function createDateTime(epoch: number, timeZone: TimeZone): DateTime {
  return Object.freeze({ kind: "date-time", epochMilliseconds: epochMilliseconds(epoch), timeZone: createTimeZone(timeZone.id) });
}

export function createWallDateTime(date: CalendarDate, time: Time, timeZone: TimeZone): WallDateTime {
  return Object.freeze({
    kind: "wall-date-time",
    date: createCalendarDate(date.year, date.month, date.day),
    time: createTime(time.hour, time.minute, time.second, time.millisecond),
    timeZone: createTimeZone(timeZone.id),
  });
}

function internationalizedWall(value: WallDateTime): InternationalizedCalendarDateTime {
  return new InternationalizedCalendarDateTime(
    value.date.year, value.date.month, value.date.day,
    value.time.hour, value.time.minute, value.time.second, value.time.millisecond,
  );
}

function sameWall(value: WallDateTime, epoch: number): boolean {
  const actual = fromAbsolute(epoch, value.timeZone.id);
  return actual.year === value.date.year && actual.month === value.date.month && actual.day === value.date.day
    && actual.hour === value.time.hour && actual.minute === value.time.minute && actual.second === value.time.second
    && actual.millisecond === value.time.millisecond;
}

function selected(disambiguation: DateTimeDisambiguation, earlier: DateTime, later: DateTime, kind: "ambiguous" | "nonexistent"): DateTime | undefined {
  if (disambiguation === "earlier") return earlier;
  if (disambiguation === "later") return later;
  if (disambiguation === "compatible") return kind === "ambiguous" ? earlier : later;
  return undefined;
}

export function resolveWallDateTime(value: WallDateTime, disambiguation: DateTimeDisambiguation = "reject"): DateTimeResolution {
  const wall = createWallDateTime(value.date, value.time, value.timeZone);
  const internal = internationalizedWall(wall);
  const earlier = createDateTime(internal.toDate(wall.timeZone.id, "earlier").getTime(), wall.timeZone);
  const later = createDateTime(internal.toDate(wall.timeZone.id, "later").getTime(), wall.timeZone);
  const earlierValid = sameWall(wall, earlier.epochMilliseconds);
  const laterValid = sameWall(wall, later.epochMilliseconds);
  if (earlierValid && laterValid && earlier.epochMilliseconds === later.epochMilliseconds) return Object.freeze({ kind: "exact", value: earlier });
  if (earlierValid && laterValid) {
    const valueForPolicy = selected(disambiguation, earlier, later, "ambiguous");
    return Object.freeze({ kind: "ambiguous", earlier, later, ...(valueForPolicy === undefined ? {} : { value: valueForPolicy }) });
  }
  const valueForPolicy = selected(disambiguation, earlier, later, "nonexistent");
  return Object.freeze({ kind: "nonexistent", earlier, later, ...(valueForPolicy === undefined ? {} : { value: valueForPolicy }) });
}

export function dateTimeToWall(value: DateTime): WallDateTime {
  const dateTime = createDateTime(value.epochMilliseconds, value.timeZone);
  const zoned = fromAbsolute(dateTime.epochMilliseconds, dateTime.timeZone.id);
  return createWallDateTime(
    createCalendarDate(zoned.year, zoned.month, zoned.day),
    createTime(zoned.hour, zoned.minute, zoned.second, zoned.millisecond),
    dateTime.timeZone,
  );
}

export function changeDateTimeZone(value: DateTime, timeZone: TimeZone, behavior: TimeZoneChangeBehavior, disambiguation: DateTimeDisambiguation = "reject"): DateTimeResolution {
  const target = createTimeZone(timeZone.id);
  if (behavior === "preserve-instant") return Object.freeze({ kind: "exact", value: createDateTime(value.epochMilliseconds, target) });
  const wall = dateTimeToWall(value);
  return resolveWallDateTime(createWallDateTime(wall.date, wall.time, target), disambiguation);
}

export function serializeDateTime(value: DateTime): string {
  const dateTime = createDateTime(value.epochMilliseconds, value.timeZone);
  return `${new Date(dateTime.epochMilliseconds).toISOString()}[${dateTime.timeZone.id}]`;
}

export function parseDateTime(value: string): DateTime {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\[([^\]]+)\]$/u.exec(value);
  if (!match) throw new RangeError(`DateTime must use an ISO instant with an IANA annotation, received ${JSON.stringify(value)}`);
  const instant = match[1];
  const timeZone = match[2];
  if (instant === undefined || timeZone === undefined) throw new RangeError(`Invalid DateTime ${JSON.stringify(value)}`);
  const epoch = Date.parse(instant);
  if (!Number.isSafeInteger(epoch)) throw new RangeError(`Invalid DateTime instant ${JSON.stringify(instant)}`);
  return createDateTime(epoch, createTimeZone(timeZone));
}

export function readDateTime(value: unknown): DateTime {
  if (!isRecord(value) || value.kind !== "date-time") throw new TypeError("Expected a serialized DateTime object");
  return createDateTime(epochMilliseconds(value.epochMilliseconds), readTimeZone(value.timeZone));
}
