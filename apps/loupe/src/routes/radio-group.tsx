import { createSignal } from "solid-js";
import { Button, RadioGroup, Stack, ThemeScope } from "@gemologic/sheen";
import type { RadioOption } from "@gemologic/sheen";

const choices: RadioOption[] = [{ value: "live", label: "Live", description: "Continuous updates" }, { value: "paused", label: "Paused", disabled: true }, { value: "manual", label: "Manual" }];

export default function RadioGroupFixture() {
  const [options, setOptions] = createSignal(choices);
  const [value, setValue] = createSignal<string | null>(null);
  const [cancelReset, setCancelReset] = createSignal(false);
  const [error, setError] = createSignal("");
  const [rtl, setRtl] = createSignal(false);
  const [submitted, setSubmitted] = createSignal("");
  return <main><h1>Radio group qualification</h1><ThemeScope direction={rtl() ? "rtl" : "ltr"}><Stack>
    <Button onClick={() => setOptions(current => [...current].reverse().map(option => ({ ...option })))}>Refresh options</Button>
    <Button onClick={() => setOptions(current => current.filter(option => option.value !== "live"))}>Remove live</Button>
    <Button onClick={() => setOptions([])}>Clear options</Button>
    <Button onClick={() => setCancelReset(current => !current)}>Cancel reset: {String(cancelReset())}</Button>
    <Button onClick={() => setError(current => current ? "" : "Choose another cadence")}>Toggle error</Button>
    <Button onClick={() => setRtl(current => !current)}>Toggle direction</Button>
    <Button onClick={() => setValue(null)}>Clear controlled selection</Button>
    <form id="cadence-form" onReset={event => { if (cancelReset()) event.preventDefault(); }} onSubmit={event => {
      event.preventDefault();
      setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));
    }}><Stack>
      <RadioGroup label="Cadence" name="cadence" options={options()} defaultValue="live" description="Choose update frequency" error={error()} />
      <RadioGroup label="Controlled cadence" name="controlled" options={choices} value={value()} onValueChange={setValue} />
      <RadioGroup label="Rejected cadence" name="rejected" options={choices} value="live" />
      <RadioGroup label="Readonly cadence" name="readonly" options={choices} defaultValue="live" readOnly />
      <RadioGroup label="Disabled cadence" name="disabled" options={choices} defaultValue="live" disabled />
      <Button type="submit">Inspect values</Button>
      <Button type="reset">Reset cadence</Button>
    </Stack></form>
    <RadioGroup label="External cadence" name="external" form="cadence-form" options={choices.map(option => ({ ...option, disabled: false }))} defaultValue="manual" orientation="horizontal" />
    <output aria-label="Form values">{submitted()}</output>
    <form onSubmit={event => { event.preventDefault(); setSubmitted("required accepted"); }}>
      <RadioGroup label="Required cadence" name="required" options={choices} required />
      <Button type="submit">Validate required</Button>
    </form>
  </Stack></ThemeScope></main>;
}
