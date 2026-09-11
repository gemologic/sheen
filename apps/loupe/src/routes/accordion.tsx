import { createSignal, For } from "solid-js";
import { Accordion, AccordionItem, Button, Input, Stack, ThemeScope } from "@gemologic/sheen";

export default function AccordionFixture() {
  const [label, setLabel] = createSignal("General");
  const [requests, setRequests] = createSignal("none");
  const [remote, setRemote] = createSignal(["remote"]);
  const [sections, setSections] = createSignal(["Alpha", "Beta", "Gamma"]);
  return <main><h1>Accordion qualification</h1><Stack>
    <Button onClick={() => setLabel(value => value === "General" ? "Updated general" : "General")}>Refresh heading</Button>
    <Input label="Outside draft" />
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setRemote([]);
    }}>Close remote section</Button>
    <Accordion role="group" aria-label="Remote sections" value={remote()} onValueChange={setRemote}>
      <AccordionItem value="remote" label="Remote section"><Input label="Remote draft" /></AccordionItem>
    </Accordion>
    <Accordion role="group" aria-label="Single sections" defaultValue={["general"]}>
      <AccordionItem value="general" label={label()} headingLevel={2}><Input label="General draft" /></AccordionItem>
      <AccordionItem value="disabled" label="Unavailable" disabled>Unavailable content</AccordionItem>
      <AccordionItem value="advanced" label="Advanced" headingLevel={2}><Input label="Advanced draft" /></AccordionItem>
    </Accordion>
    <Accordion role="group" aria-label="Controlled sections" value={["locked"]} collapsible={false} onValueChange={next => setRequests(next.join(","))}>
      <AccordionItem value="locked" label="Required section">Required content</AccordionItem>
      <AccordionItem value="other" label="Other section">Other content</AccordionItem>
    </Accordion>
    <output aria-label="Accordion request">{requests()}</output>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setSections(values => values.filter(value => value !== "Beta"));
    }}>Remove Beta after request</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setSections(values => [...values].reverse());
    }}>Reverse sections after request</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setSections([]);
    }}>Clear sections after request</Button>
    <Accordion role="group" aria-label="Dynamic sections" multiple defaultValue={["Alpha", "Beta", "Gamma"]}>
      <For each={sections()}>{value => <AccordionItem value={value} label={value}><Input label={`${value} draft`} /></AccordionItem>}</For>
    </Accordion>
    <Accordion role="group" aria-label="Outer sections" defaultValue={["outer-one"]}>
      <AccordionItem value="outer-one" label="Outer first">
        <Accordion role="group" aria-label="Inner sections" onKeyDown={event => { if (event.key === "Home") event.preventDefault(); }}>
          <AccordionItem value="inner-one" label="Inner first">First nested content</AccordionItem>
          <AccordionItem value="inner-two" label="Inner second">Second nested content</AccordionItem>
        </Accordion>
      </AccordionItem>
      <AccordionItem value="outer-two" label="Outer second">Second outer content</AccordionItem>
    </Accordion>
    <ThemeScope theme="paper" mode="light" direction="rtl" motion="reduced">
      <Accordion role="group" aria-label="Multiple sections" multiple defaultValue={["one"]}>
        <AccordionItem value="one" label="First section"><Input label="First draft" /></AccordionItem>
        <AccordionItem value="two" label="Second section"><Input label="Second draft" /></AccordionItem>
      </Accordion>
    </ThemeScope>
  </Stack></main>;
}
