import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { Calendar } from "./Calendar.tsx";
import { DateField } from "./DateField.tsx";
import { DatePicker, DateRangePicker } from "./DatePicker.tsx";
import { DateTimePicker } from "./DateTimePicker.tsx";
import { TimeField } from "./TimeField.tsx";
import { TimePicker } from "./TimePicker.tsx";
import { TimeZoneSelect } from "./TimeZoneSelect.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import { createDateRange } from "./date-range.ts";
import { createDateTime } from "./date-time.ts";
import { createTimeZone } from "./time-zone.ts";
import { createTime } from "./time.ts";

const date = createCalendarDate(2026, 9, 8);
const time = createTime(14, 30);
const zones = [{ id: "UTC", label: "UTC" }, { id: "America/New_York", label: "New York" }];

describe("date component server contracts", () => {
  it("renders a complete deterministic inline calendar and ISO projection", () => {
    const html = renderToString(() => <ThemeProvider initialState={{ theme: "obsidian", mode: "dark", accent: "jade", density: "comfortable", radius: "soft", motion: "full", direction: "ltr", locale: "en-US" }}>
      <Calendar label="Deployment date" name="deployment" value={date} defaultVisibleDate={date} minValue={createCalendarDate(2026, 9, 1)} maxValue={createCalendarDate(2026, 9, 30)} isDateUnavailable={value => value.day === 13} />
    </ThemeProvider>);
    expect(html).toContain("Deployment date");
    expect(html).toContain('role="grid"');
    expect(html).toContain('name="deployment"');
    expect(html).toContain('value="2026-09-08"');
    expect(html).toContain("September 2026");
  });

  it("renders segmented date and time values in the explicit locale", () => {
    const html = renderToString(() => <ThemeProvider locale="de-DE">
      <DateField label="Datum" name="date" value={date} description="Kalendertag" />
      <TimeField label="Zeit" name="time" value={time} hourCycle={24} />
    </ThemeProvider>);
    expect(html).toContain("Datum");
    expect(html).toContain("Zeit");
    expect(html).toContain('role="spinbutton"');
    expect(html).toContain('value="2026-09-08"');
    expect(html).toContain('value="14:30:00.000"');
    expect(html).not.toContain("AM");
  });

  it("keeps the ISO value while changing the calendar presentation", () => {
    const html = renderToString(() => <ThemeProvider locale="en-US">
      <DateField label="Buddhist date" name="date" value={date} calendar="buddhist" />
    </ThemeProvider>);
    expect(html).toContain("Buddhist date");
    expect(html).toContain("2569");
    expect(html).toContain('value="2026-09-08"');
  });

  it("keeps closed popup content out of server markup and projects accepted values", () => {
    const html = renderToString(() => <ThemeProvider>
      <DatePicker label="Date" name="date" value={date} defaultVisibleDate={date} />
      <DateRangePicker label="Window" name="window" value={createDateRange(date, createCalendarDate(2026, 9, 10))} defaultVisibleDate={date} />
      <TimePicker label="Slot" name="slot" value={time} stepMinutes={30} />
      <TimeZoneSelect label="Zone" name="zone" options={zones} value={createTimeZone("UTC")} />
    </ThemeProvider>);
    expect(html).not.toContain("sheen-date-content");
    expect(html).toContain('value="2026-09-08/2026-09-10"');
    expect(html).toContain('value="14:30:00.000"');
    expect(html).toContain('name="zone"');
  });

  it("renders one unambiguous instant projection without exposing dependency values", () => {
    const value = createDateTime(Date.UTC(2026, 8, 8, 14, 30), createTimeZone("UTC"));
    const html = renderToString(() => <ThemeProvider><DateTimePicker label="Maintenance start" name="startsAt" value={value} timeZoneOptions={zones} /></ThemeProvider>);
    expect(html).toContain("Maintenance start");
    expect(html).toContain('name="startsAt"');
    expect(html).toContain("2026-09-08T14:30:00.000Z[UTC]");
    expect(html).not.toContain("sheen-date-time-resolution");
  });
});
