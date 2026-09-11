import { createSignal } from "solid-js";
import { Button, Dialog, Select, Stack, ThemeScope } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";

const choices: SelectOption[] = [{ value: "live", label: "Live", description: "Continuous updates" }, { value: "paused", label: "Paused", disabled: true }, { value: "manual", label: "Manual" }];
export default function SelectFixture() {
  const [options, setOptions] = createSignal(choices);
  const [value, setValue] = createSignal<string | null>(null);
  const [cancel, setCancel] = createSignal(false);
  const [result, setResult] = createSignal("");
  const [error, setError] = createSignal("");
  return <main><h1>Select qualification</h1><Stack>
    <Button onClick={() => setOptions(current => [...current].reverse().map(option => ({ ...option })))}>Refresh options</Button>
    <Button onClick={() => setOptions(current => current.filter(option => option.value !== "live"))}>Remove live</Button>
    <Button onClick={() => setOptions([])}>Clear options</Button>
    <Button onClick={() => setOptions(choices)}>Restore options</Button>
    <Button onClick={() => setCancel(current => !current)}>Cancel reset: {String(cancel())}</Button>
    <Button onClick={() => setError(current => current ? "" : "Choose another cadence")}>Toggle error</Button>
    <Button onClick={() => setValue(null)}>Clear controlled</Button>
    <form id="select-form" onReset={event => { if (cancel()) event.preventDefault(); }} onSubmit={event => {
      event.preventDefault(); setResult(JSON.stringify([...new FormData(event.currentTarget).entries()]));
    }}><Stack>
      <Select label="Cadence" name="cadence" options={options()} defaultValue="live" description="Choose update frequency" error={error()} />
      <Select label="Controlled" name="controlled" options={choices} value={value()} onValueChange={setValue} />
      <Select label="Rejected" name="rejected" options={choices} value="live" />
      <Select label="Readonly" name="readonly" options={choices} defaultValue="live" readOnly />
      <Select label="Disabled" name="disabled" options={choices} defaultValue="live" disabled />
      <Button type="submit">Inspect values</Button><Button type="reset">Reset selects</Button>
    </Stack></form>
    <Select label="External" name="external" form="select-form" options={choices} defaultValue="manual" />
    <output aria-label="Form values">{result()}</output>
    <form onSubmit={event => { event.preventDefault(); setResult("required accepted"); }}>
      <Select label="Required" options={choices} required />
      <Button type="submit">Validate required</Button>
    </form>
    <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="select-scope">
      <Dialog title="Scoped dialog" trigger="Open scoped dialog"><Select label="Scoped cadence" options={choices} defaultValue="live" /></Dialog>
    </ThemeScope>
  </Stack></main>;
}
