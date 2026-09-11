import { createSignal } from "solid-js";
import { Button, Collapsible, Input, Stack, ThemeScope } from "@gemologic/sheen";

export default function CollapsibleFixture() {
  const [open, setOpen] = createSignal(true);
  const [accept, setAccept] = createSignal(false);
  const [request, setRequest] = createSignal("none");
  const [label, setLabel] = createSignal("Advanced settings");
  const [submits, setSubmits] = createSignal(0);
  return <main><h1>Collapsible qualification</h1><Stack>
    <Button onClick={() => setLabel(value => value === "Advanced settings" ? "Updated settings" : "Advanced settings")}>Refresh label</Button>
    <Button onClick={() => setAccept(value => !value)}>Toggle acceptance</Button>
    <Button onClick={async () => {
      await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      setOpen(false);
    }}>Close controlled after request</Button>
    <Input label="Outside draft" />
    <output aria-label="Requested state">{request()}</output>
    <output aria-label="Form submits">{submits()}</output>
    <form onSubmit={event => { event.preventDefault(); setSubmits(value => value + 1); }}>
      <Collapsible label={label()}><Input label="Advanced draft" /></Collapsible>
      <Collapsible label="Controlled settings" open={open()} onOpenChange={next => { setRequest(String(next)); if (accept()) setOpen(next); }}><Input label="Controlled draft" /></Collapsible>
      <Collapsible label="Unavailable settings" disabled><Input label="Unavailable draft" /></Collapsible>
    </form>
    <ThemeScope theme="paper" mode="light" direction="rtl" motion="reduced">
      <Collapsible label="Scoped settings" defaultOpen><Input label="Scoped draft" /></Collapsible>
    </ThemeScope>
  </Stack></main>;
}
