import { createSignal } from "solid-js";
import { Button, Checkbox, Stack, ThemeScope } from "@gemologic/sheen";

export default function CheckboxFixture() {
  const [checked, setChecked] = createSignal(false);
  const [mixed, setMixed] = createSignal(true);
  const [error, setError] = createSignal("");
  const [submitted, setSubmitted] = createSignal("");
  const [rtl, setRtl] = createSignal(false);
  const [cancelReset, setCancelReset] = createSignal(false);
  return <main><h1>Checkbox qualification</h1>
    <ThemeScope direction={rtl() ? "rtl" : "ltr"}>
      <Stack>
        <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
        <Button onClick={() => setError(value => value ? "" : "Review this choice")}>Toggle validation</Button>
        <Button onClick={() => setCancelReset(value => !value)}>Cancel reset: {String(cancelReset())}</Button>
        <form onReset={event => { if (cancelReset()) event.preventDefault(); }} onSubmit={event => {
          event.preventDefault();
          setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));
        }}>
          <Stack>
            <Checkbox label="Uncontrolled alerts" name="alerts" value="enabled" defaultChecked description="Workspace notifications" error={error()} />
            <Checkbox label="Controlled alerts" checked={checked()} onCheckedChange={setChecked} name="controlled" />
            <Checkbox label="Rejected change" checked={false} />
            <Checkbox label="Partial selection" indeterminate={mixed()} onCheckedChange={() => setMixed(false)} />
            <Checkbox label="Disabled choice" defaultChecked disabled name="disabled" />
            <Checkbox label="Read-only choice" defaultChecked readOnly name="readonly" />
            <Button type="submit">Inspect form</Button>
            <Button type="reset">Reset choices</Button>
          </Stack>
        </form>
        <output aria-label="Form values">{submitted()}</output>
      </Stack>
    </ThemeScope>
  </main>;
}
