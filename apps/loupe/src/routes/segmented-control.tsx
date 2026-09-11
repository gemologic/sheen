import { Button, SegmentedControl, Stack, Surface, ThemeScope } from "@gemologic/sheen";
import { createSignal } from "solid-js";

const periods = [
  { value: "hour", label: "Last hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

export default function SegmentedControlFixture() {
  const [period, setPeriod] = createSignal<string | null>("week");
  const [formValue, setFormValue] = createSignal("");
  return <main class="loupe-segmented-page"><h1>SegmentedControl</h1><Stack>
    <form onSubmit={event => { event.preventDefault(); setFormValue(JSON.stringify([...new FormData(event.currentTarget).entries()])); }}>
      <Surface padding="lg"><Stack>
        <div class="loupe-segmented-overflow"><SegmentedControl label="Report period" name="period" options={periods} value={period()} onValueChange={setPeriod} description="Arrow keys move and select; Home and End jump to the bounds." required /></div>
        <SegmentedControl label="Display mode" name="display" options={[{ value: "table", label: "Table" }, { value: "chart", label: "Chart" }, { value: "map", label: "Map", disabled: true }]} defaultValue="table" size="md" />
        <SegmentedControl label="Read-only grouping" name="grouping" options={[{ value: "team", label: "Team" }, { value: "owner", label: "Owner" }]} defaultValue="team" readOnly />
        <Button type="submit">Inspect values</Button><output aria-label="Segmented form values">{formValue()}</output>
      </Stack></Surface>
    </form>
    <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-segmented-scope">
      <SegmentedControl label="RTL interval" name="rtl-period" options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }]} defaultValue="week" />
    </ThemeScope>
  </Stack></main>;
}
