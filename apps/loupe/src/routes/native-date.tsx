import { Button, Stack } from "@gemologic/sheen";
import { NativeDateField, NativeDateTimeField, NativeTimeField, createCalendarDate, createTime, createTimeZone, serializeDateTime } from "@gemologic/sheen-date/native";
import type { DateTime } from "@gemologic/sheen-date/native";
import { createSignal } from "solid-js";
import "@gemologic/sheen-date/styles.css";

const newYork = createTimeZone("America/New_York");

export default function NativeDatePreview() {
  const [submitted, setSubmitted] = createSignal("");
  const [instant, setInstant] = createSignal<DateTime | null>(null);
  const instantText = (): string => {
    const value = instant();
    return value ? serializeDateTime(value) : "none";
  };
  return <main class="loupe-native-date-page">
    <h1>Native date inputs</h1>
    <p>Native date, time, and datetime-local inputs with Sheen values and ISO form projections.</p>
    <form id="native-date-form" onSubmit={event => {
      event.preventDefault();
      setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));
    }}>
      <Stack gap="md">
        <NativeDateField id="native-date" label="Invoice date" name="invoiceDate" defaultValue={createCalendarDate(2026, 9, 8)}
          minValue={createCalendarDate(2026, 1, 1)} maxValue={createCalendarDate(2026, 12, 31)} required />
        <NativeTimeField id="native-time" label="Daily cutoff" name="cutoff" defaultValue={createTime(17, 30)} />
        <NativeDateTimeField id="native-date-time" label="Change window start (New York)" name="startsAt" timeZone={newYork}
          value={instant()} onValueChange={setInstant} description="Entered in America/New_York" />
        <NativeDateField id="native-invalid" label="Settlement date" error="Settlement must be a business day" />
        <div class="actions">
          <Button type="submit">Submit</Button>
          <Button type="reset">Reset</Button>
        </div>
      </Stack>
    </form>
    <output id="native-instant">{instantText()}</output>
    <pre id="native-submitted">{submitted()}</pre>
  </main>;
}
