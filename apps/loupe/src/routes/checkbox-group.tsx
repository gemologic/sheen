import { createSignal } from "solid-js";
import { Button, CheckboxGroup, Stack, Switch, ThemeScope } from "@gemologic/sheen";
import type { CheckboxOption } from "@gemologic/sheen";

const channels: CheckboxOption[] = [{ value: "email", label: "Email", description: "Inbox delivery" }, { value: "desktop", label: "Desktop" }, { value: "sms", label: "SMS", disabled: true }];

export default function CheckboxGroupFixture() {
  const [options, setOptions] = createSignal(channels);
  const [value, setValue] = createSignal<string[]>([]);
  const [error, setError] = createSignal("");
  const [disabled, setDisabled] = createSignal(false);
  const [cancelReset, setCancelReset] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [submitted, setSubmitted] = createSignal("");
  return <main><h1>Checkbox group qualification</h1><ThemeScope direction={rtl() ? "rtl" : "ltr"}><Stack>
    <Button onClick={() => setOptions(current => [...current].reverse().map(option => ({ ...option })))}>Refresh options</Button>
    <Button onClick={() => setOptions(current => current.filter(option => option.value !== "email"))}>Remove email</Button>
    <Button onClick={() => setOptions([])}>Clear options</Button>
    <Button onClick={() => setError(current => current ? "" : "Choose another channel")}>Toggle validation</Button>
    <Button onClick={() => setDisabled(current => !current)}>Toggle disabled</Button>
    <Button onClick={() => setCancelReset(current => !current)}>Cancel reset: {String(cancelReset())}</Button>
    <Button onClick={() => setRtl(current => !current)}>Toggle direction</Button>
    <form id="channel-form" onReset={event => { if (cancelReset()) event.preventDefault(); }} onSubmit={event => {
      event.preventDefault();
      setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));
    }}><Stack>
      <CheckboxGroup label="Channels" options={options()} name="channels" defaultValue={["email"]} description="Choose delivery channels" error={error()} disabled={disabled()} />
      <CheckboxGroup label="Controlled channels" options={channels} name="controlled" value={value()} onValueChange={setValue} />
      <CheckboxGroup label="Rejected channels" options={channels} value={[]} />
      <CheckboxGroup label="Readonly channels" options={channels} readOnly defaultValue={["email"]} name="readonly" />
      <Button type="submit">Inspect form</Button>
      <Button type="reset">Reset channels</Button>
    </Stack></form>
    <CheckboxGroup label="External channels" options={channels} defaultValue={["desktop"]} name="external" form="channel-form" />
    <Switch label="External switch" name="external-switch" form="channel-form" defaultChecked />
    <output aria-label="Form values">{submitted()}</output>
  </Stack></ThemeScope></main>;
}
