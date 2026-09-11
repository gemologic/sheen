import { Button, Stack, Surface, ThemeScope } from "@gemologic/sheen";
import {
  Calendar, DateField, DatePicker, DateRangePicker, DateTimePicker, TimeField, TimePicker, TimeZoneSelect,
  createCalendarDate, createDateRange, createDateTime, createTime, createTimeZone,
} from "@gemologic/sheen-date";
import type { CalendarDate, DateRange, DateTime, Time, TimeZone, TimeZoneOption } from "@gemologic/sheen-date";
import { createSignal } from "solid-js";

const initialDate = createCalendarDate(2026, 11, 1);
const initialDeploymentDate = createCalendarDate(2026, 11, 5);
const initialRange = createDateRange(createCalendarDate(2026, 11, 1), createCalendarDate(2026, 11, 7));
const initialTime = createTime(1, 30);
const initialInstant = createDateTime(Date.UTC(2026, 10, 1, 1, 30), createTimeZone("UTC"));
const initialZones: readonly TimeZoneOption[] = [
  { id: "UTC", label: "UTC · r1", description: "Coordinated Universal Time" },
  { id: "America/New_York", label: "New York · r1", description: "Eastern Time" },
  { id: "America/Chicago", label: "Chicago · r1", description: "Central Time" },
  { id: "Europe/London", label: "London · r1", description: "United Kingdom" },
  { id: "Asia/Tokyo", label: "Tokyo · r1", description: "Japan Standard Time" },
];

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function parseZones(value: unknown): TimeZoneOption[] {
  if (!Array.isArray(value)) throw new Error("Invalid time zone response");
  return value.map(candidate => {
    if (!record(candidate) || typeof candidate.id !== "string" || typeof candidate.label !== "string" || typeof candidate.description !== "string") throw new Error("Invalid time zone response");
    return { id: candidate.id, label: candidate.label, description: candidate.description };
  });
}

export default function DateTimeFixture() {
  const [date, setDate] = createSignal<CalendarDate | null>(initialDate);
  const [deploymentDate, setDeploymentDate] = createSignal<CalendarDate | null>(initialDeploymentDate);
  const [range, setRange] = createSignal<DateRange | null>(initialRange);
  const [cutoffTime, setCutoffTime] = createSignal<Time | null>(initialTime);
  const [reviewTime, setReviewTime] = createSignal<Time | null>(initialTime);
  const [zone, setZone] = createSignal<TimeZone | null>(createTimeZone("UTC"));
  const [instant, setInstant] = createSignal<DateTime | null>(initialInstant);
  const [resolution, setResolution] = createSignal("exact");
  const [zones, setZones] = createSignal<readonly TimeZoneOption[]>(initialZones);
  const [pending, setPending] = createSignal(false);
  const [revision, setRevision] = createSignal(1);
  const [formValue, setFormValue] = createSignal("");
  let requestToken = 0;

  async function refreshZones(): Promise<void> {
    const nextRevision = revision() + 1;
    const token = ++requestToken;
    setPending(true);
    try {
      const response = await fetch(`/api/date-options?revision=${nextRevision}`);
      if (!response.ok) throw new Error(`Time zone refresh failed (${response.status})`);
      const next = parseZones(await response.json());
      if (token !== requestToken) return;
      setZones(next);
      setRevision(nextRevision);
    } finally {
      if (token === requestToken) setPending(false);
    }
  }

  return <main class="loupe-date-page">
    <header><h1>Date and time</h1><p>Serializable values, deterministic server markup, scoped overlays, and explicit DST resolution.</p></header>
    <form id="date-fixture-form" onSubmit={event => { event.preventDefault(); setFormValue(JSON.stringify([...new FormData(event.currentTarget).entries()])); }}>
      <div class="loupe-date-grid">
        <Surface padding="md"><h2>Fields and pickers</h2><Stack>
          <DateField label="Invoice date" name="invoiceDate" value={date()} onValueChange={setDate} placeholderValue={initialDate} />
          <DatePicker label="Settlement date" name="settlementDate" value={date()} onValueChange={setDate} defaultVisibleDate={initialDate}
            presets={[{ id: "launch", label: "Launch day", value: initialDate }]} />
          <DateRangePicker label="Report window" endLabel="Report end date" name="reportWindow" value={range()} onValueChange={setRange} defaultVisibleDate={initialDate}
            presets={[{ id: "launch-week", label: "Launch week", value: initialRange }]} />
          <TimeField label="Cutoff time" name="cutoff" value={cutoffTime()} onValueChange={setCutoffTime} placeholderValue={initialTime} />
          <TimePicker label="Review slot" name="reviewSlot" value={reviewTime()} onValueChange={setReviewTime} stepMinutes={30} />
          <TimeZoneSelect label="Display zone" name="displayZone" options={zones()} value={zone()} onValueChange={setZone} pending={pending()} />
        </Stack></Surface>
        <Surface padding="md"><h2>Inline calendar</h2>
          <Calendar label="Deployment calendar" name="deploymentDate" value={deploymentDate()} onValueChange={setDeploymentDate} defaultVisibleDate={initialDate}
            minValue={createCalendarDate(2026, 11, 3)} maxValue={createCalendarDate(2026, 11, 20)}
            isDateUnavailable={candidate => candidate.day === 13 + revision()} />
        </Surface>
        <Surface padding="md"><h2>Instant and timezone</h2><Stack>
          <DateTimePicker label="Maintenance start" name="startsAt" value={instant()} onValueChange={setInstant}
            onResolution={next => setResolution(next.kind)} timeZoneOptions={zones()} timeZonePending={pending()}
            timeZoneChangeBehavior="preserve-wall" defaultDate={initialDate} defaultTime={initialTime} />
          <output aria-label="Date-time resolution">{resolution()}</output>
          <Button type="button" onClick={() => void refreshZones()}>Refresh time zones</Button>
          <output aria-label="Time-zone revision">Revision {revision()}</output>
        </Stack></Surface>
        <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-date-scope">
          <h2>Scoped RTL picker</h2>
          <DatePicker label="تاريخ التسوية" defaultValue={createCalendarDate(2026, 11, 4)} defaultVisibleDate={initialDate} />
        </ThemeScope>
      </div>
      <div class="loupe-date-actions"><Button type="submit" variant="solid" tone="accent">Inspect form</Button><output aria-label="Date form values">{formValue()}</output></div>
    </form>
  </main>;
}
