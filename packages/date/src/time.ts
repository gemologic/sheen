import { integer, isRecord } from "./guards.ts";
import type { Time } from "./types.ts";

function pad(value: number, length: number): string { return String(value).padStart(length, "0"); }

export function createTime(hour: number, minute: number, second = 0, millisecond = 0): Time {
  return Object.freeze({
    kind: "time",
    hour: integer(hour, "Time.hour", 0, 23),
    minute: integer(minute, "Time.minute", 0, 59),
    second: integer(second, "Time.second", 0, 59),
    millisecond: integer(millisecond, "Time.millisecond", 0, 999),
  });
}

export function serializeTime(value: Time): string {
  const time = createTime(value.hour, value.minute, value.second, value.millisecond);
  return `${pad(time.hour, 2)}:${pad(time.minute, 2)}:${pad(time.second, 2)}.${pad(time.millisecond, 3)}`;
}

export function parseTime(value: string): Time {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/u.exec(value);
  if (!match) throw new RangeError(`Time must use HH:mm, HH:mm:ss, or HH:mm:ss.SSS, received ${JSON.stringify(value)}`);
  const hour = match[1];
  const minute = match[2];
  if (hour === undefined || minute === undefined) throw new RangeError(`Invalid ISO time ${JSON.stringify(value)}`);
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  const parsedSecond = Number(match[3] ?? "0");
  const parsedMillisecond = Number((match[4] ?? "0").padEnd(3, "0"));
  if (parsedHour > 23 || parsedMinute > 59 || parsedSecond > 59 || parsedMillisecond > 999) throw new RangeError(`Invalid ISO time ${JSON.stringify(value)}`);
  return createTime(parsedHour, parsedMinute, parsedSecond, parsedMillisecond);
}

export function readTime(value: unknown): Time {
  if (!isRecord(value) || value.kind !== "time") throw new TypeError("Expected a serialized Time object");
  return createTime(
    integer(value.hour, "Time.hour", 0, 23),
    integer(value.minute, "Time.minute", 0, 59),
    integer(value.second, "Time.second", 0, 59),
    integer(value.millisecond, "Time.millisecond", 0, 999),
  );
}
