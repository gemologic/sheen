import { createSignal } from "solid-js";
import { Button, Stack, Switch, ThemeScope } from "@gemologic/sheen";

export default function SwitchFixture() {
  const [checked, setChecked] = createSignal(false);
  const [cancelReset, setCancelReset] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [error, setError] = createSignal("");
  const [values, setValues] = createSignal("");
  return <main><h1>Switch qualification</h1><ThemeScope direction={rtl() ? "rtl" : "ltr"}>
    <Stack>
      <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
      <Button onClick={() => setError(value => value ? "" : "Connection unavailable")}>Toggle error</Button>
      <Button onClick={() => setCancelReset(value => !value)}>Cancel reset: {String(cancelReset())}</Button>
      <form onReset={event => { if (cancelReset()) event.preventDefault(); }} onSubmit={event => {
        event.preventDefault();
        setValues(JSON.stringify([...new FormData(event.currentTarget).entries()]));
      }}>
        <Stack>
          <Switch label="Live updates" name="live" value="enabled" defaultChecked description="Automatic refresh" error={error()} />
          <Switch label="Controlled setting" name="controlled" checked={checked()} onCheckedChange={setChecked} />
          <Switch label="Rejected setting" checked={false} />
          <Switch label="Disabled setting" defaultChecked disabled name="disabled" />
          <Switch label="Readonly setting" defaultChecked readOnly name="readonly" />
          <Switch label="Unnamed setting" defaultChecked />
          <Button type="submit">Inspect values</Button>
          <Button type="reset">Reset switches</Button>
        </Stack>
      </form>
      <output aria-label="Form values">{values()}</output>
    </Stack>
  </ThemeScope></main>;
}
