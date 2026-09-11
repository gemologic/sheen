import {
  createCalendarDate,
  createDateRange,
  createDateTime,
  createTime,
  createTimeZone,
  serializeDateRange,
  serializeDateTime,
} from "@gemologic/sheen-date/core";
import type { DatePickerProps, DateTimePickerProps, TimeZoneOption } from "@gemologic/sheen-date";

const date = createCalendarDate(2026, 11, 1);
const time = createTime(1, 30);
const zone = createTimeZone("America/New_York");
const instant = createDateTime(Date.UTC(2026, 10, 1, 5, 30), zone);
const options: readonly TimeZoneOption[] = [{ id: zone.id, label: "New York" }];
const picker: DatePickerProps = { label: "Start", value: date };
const dateTimePicker: DateTimePickerProps = { label: "Maintenance", value: instant, defaultTime: time, timeZoneOptions: options };

process.stdout.write(`${picker.label}:${dateTimePicker.label}:${serializeDateRange(createDateRange(date, date))}:${serializeDateTime(instant)}\n`);
