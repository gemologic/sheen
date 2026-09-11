import { describe, expect, it } from "vitest";
import {
  changeDateTimeZone, createCalendarDate, createDateRange, createDateTime, createTime, createTimeZone,
  createWallDateTime, dateTimeToWall, formatCalendarDate, formatDateTime, formatTime, parseCalendarDate,
  parseDateRange, parseDateTime, parseTime, readCalendarDate, readDateTime, resolveWallDateTime,
  serializeCalendarDate, serializeDateRange, serializeDateTime, serializeTime,
} from "./core.ts";

describe("Sheen date values", () => {
  it("validates and round-trips immutable ISO calendar dates, times, and ranges", () => {
    const leapDay = createCalendarDate(2024, 2, 29);
    const time = createTime(23, 7, 8, 9);
    const range = createDateRange(createCalendarDate(2024, 2, 1), leapDay);
    expect(serializeCalendarDate(leapDay)).toBe("2024-02-29");
    expect(parseCalendarDate("2024-02-29")).toEqual(leapDay);
    expect(serializeTime(time)).toBe("23:07:08.009");
    expect(parseTime("23:07")).toEqual(createTime(23, 7));
    expect(serializeDateRange(range)).toBe("2024-02-01/2024-02-29");
    expect(parseDateRange("2024-02-01/2024-02-29")).toEqual(range);
    expect(Object.isFrozen(leapDay)).toBe(true);
    expect(Object.isFrozen(range)).toBe(true);
    expect(() => createCalendarDate(2023, 2, 29)).toThrow("Invalid ISO calendar date");
    expect(() => parseTime("24:00")).toThrow("Invalid ISO time");
    expect(() => createDateRange(leapDay, createCalendarDate(2024, 2, 1))).toThrow("must not be after");
  });

  it("parses untrusted serialized values without accepting native Date-shaped input", () => {
    const date = readCalendarDate(JSON.parse('{"kind":"calendar-date","year":2026,"month":9,"day":8}'));
    expect(date).toEqual(createCalendarDate(2026, 9, 8));
    expect(() => readCalendarDate(new Date(0))).toThrow("serialized CalendarDate");
    expect(() => readCalendarDate({ kind: "calendar-date", year: 2026, month: 13, day: 1 })).toThrow("CalendarDate.month");
  });

  it("distinguishes exact, repeated, and nonexistent wall times with fail-closed defaults", () => {
    const zone = createTimeZone("America/New_York");
    const exact = resolveWallDateTime(createWallDateTime(createCalendarDate(2024, 1, 15), createTime(12, 0), zone));
    expect(exact.kind).toBe("exact");

    const repeated = createWallDateTime(createCalendarDate(2024, 11, 3), createTime(1, 30), zone);
    const rejectedRepeat = resolveWallDateTime(repeated);
    expect(rejectedRepeat.kind).toBe("ambiguous");
    if (rejectedRepeat.kind === "ambiguous") {
      expect(rejectedRepeat.value).toBeUndefined();
      expect(rejectedRepeat.later.epochMilliseconds - rejectedRepeat.earlier.epochMilliseconds).toBe(3_600_000);
    }
    const laterRepeat = resolveWallDateTime(repeated, "later");
    expect(laterRepeat.kind === "ambiguous" ? laterRepeat.value : undefined).toEqual(laterRepeat.kind === "ambiguous" ? laterRepeat.later : undefined);

    const skipped = createWallDateTime(createCalendarDate(2024, 3, 10), createTime(2, 30), zone);
    const rejectedSkip = resolveWallDateTime(skipped);
    expect(rejectedSkip.kind).toBe("nonexistent");
    expect(rejectedSkip.kind === "nonexistent" ? rejectedSkip.value : undefined).toBeUndefined();
    const compatibleSkip = resolveWallDateTime(skipped, "compatible");
    expect(compatibleSkip.kind === "nonexistent" ? compatibleSkip.value : undefined).toEqual(compatibleSkip.kind === "nonexistent" ? compatibleSkip.later : undefined);
  });

  it("stores date-times as an instant plus IANA zone and projects a documented ISO form value", () => {
    const zone = createTimeZone("America/New_York");
    const resolution = resolveWallDateTime(createWallDateTime(createCalendarDate(2024, 11, 3), createTime(1, 30), zone), "earlier");
    if (resolution.kind !== "ambiguous" || resolution.value === undefined) throw new Error("Expected an explicitly resolved repeated time");
    const projected = serializeDateTime(resolution.value);
    expect(projected).toBe("2024-11-03T05:30:00.000Z[America/New_York]");
    expect(parseDateTime(projected)).toEqual(resolution.value);
    expect(readDateTime(JSON.parse(JSON.stringify(resolution.value)))).toEqual(resolution.value);
    expect(dateTimeToWall(resolution.value)).toEqual(createWallDateTime(createCalendarDate(2024, 11, 3), createTime(1, 30), zone));
  });

  it("makes time-zone changes explicitly preserve either the instant or wall clock", () => {
    const utc = createTimeZone("UTC");
    const newYork = createTimeZone("America/New_York");
    const source = createDateTime(1_725_192_000_000, utc);
    const instant = changeDateTimeZone(source, newYork, "preserve-instant");
    expect(instant.kind).toBe("exact");
    if (instant.kind === "exact") expect(instant.value.epochMilliseconds).toBe(source.epochMilliseconds);
    const wall = changeDateTimeZone(source, newYork, "preserve-wall");
    expect(wall.kind).toBe("exact");
    if (wall.kind === "exact") expect(wall.value.epochMilliseconds).not.toBe(source.epochMilliseconds);
    expect(() => createTimeZone("Mars/Olympus_Mons")).toThrow("Unsupported IANA time zone");
  });

  it("formats only with an explicit locale and keeps timezone/calendar choices presentational", () => {
    const date = createCalendarDate(2024, 2, 29);
    const time = createTime(13, 5);
    const instant = createDateTime(1_709_210_700_000, createTimeZone("UTC"));
    expect(formatCalendarDate(date, "en-GB")).toContain("29");
    expect(formatCalendarDate(date, "en-US-u-ca-buddhist")).not.toContain("2024");
    expect(formatTime(time, "en-GB", { hourCycle: "h23" })).toContain("13:05");
    expect(formatDateTime(instant, "en-US")).toContain("2024");
    expect(() => formatCalendarDate(date, "")).toThrow("explicit locale");
  });
});
