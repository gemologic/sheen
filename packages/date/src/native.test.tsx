import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { NativeDateField, NativeDateTimeField, NativeTimeField } from "./native.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import { createDateTime } from "./date-time.ts";
import { createTimeZone } from "./time-zone.ts";
import { createTime } from "./time.ts";

describe("native date field server contracts", () => {
  it("renders native inputs with Sheen values and ISO projections", () => {
    const html = renderToString(() => <ThemeProvider>
      <NativeDateField label="Invoice date" name="invoice" value={createCalendarDate(2026, 9, 8)} minValue={createCalendarDate(2026, 1, 1)} required />
      <NativeTimeField label="Cutoff" name="cutoff" value={createTime(17, 30)} granularity="second" />
    </ThemeProvider>);
    expect(html).toContain('type="date"');
    expect(html).toContain('value="2026-09-08"');
    expect(html).toContain('min="2026-01-01"');
    expect(html).toContain("required");
    expect(html).toContain('type="time"');
    expect(html).toContain('value="17:30:00"');
    expect(html).toContain('step="1"');
    expect(html).toContain('name="cutoff"');
    expect(html).toContain('value="17:30:00.000"');
  });

  it("displays an instant as wall time in the explicit zone and projects the instant", () => {
    const html = renderToString(() => <ThemeProvider>
      <NativeDateTimeField label="Starts" name="startsAt" timeZone={createTimeZone("America/New_York")} value={createDateTime(Date.UTC(2026, 8, 8, 14, 30), createTimeZone("America/New_York"))} />
    </ThemeProvider>);
    expect(html).toContain('type="datetime-local"');
    expect(html).toContain('value="2026-09-08T10:30"');
    expect(html).toContain('value="2026-09-08T14:30:00.000Z[America/New_York]"');
    expect(html).not.toContain("sheen-date-time-resolution");
    expect(html.toLowerCase()).not.toContain("readonly");
  });

  it("marks an app error invalid and leaves an empty value unprojected", () => {
    const html = renderToString(() => <ThemeProvider>
      <NativeDateField label="Due" name="due" error="Choose a business day" description="Weekdays only" />
    </ThemeProvider>);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Choose a business day");
    expect(html).toMatch(/type="hidden"[^>]*name="due"[^>]*value=""|name="due"[^>]*value=""/u);
  });
});
