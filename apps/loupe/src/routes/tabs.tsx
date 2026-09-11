import { createSignal } from "solid-js";
import { Button, Input, Stack, Tabs, ThemeScope } from "@gemologic/sheen";

const items = [{ value: "general", label: "General" }, { value: "disabled", label: "Unavailable", disabled: true }, { value: "advanced", label: "Advanced" }];
export default function TabsFixture() {
  const [label, setLabel] = createSignal("General");
  const [request, setRequest] = createSignal("none");
  const [remote, setRemote] = createSignal("general");
  const [dynamic, setDynamic] = createSignal([{ value: "first", label: "First" }, { value: "middle", label: "Middle" }, { value: "last", label: "Last" }]);
  return <main><h1>Tabs qualification</h1><Stack>
    <Button onClick={() => setLabel("Updated general")}>Refresh tabs</Button>
    <Input label="Outside draft" />
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setRemote("advanced");
    }}>Select remote tab</Button>
    <Tabs label="Remote settings" items={items} value={remote()} onValueChange={setRemote}>{value => <Input label={`Remote ${value} draft`} />}</Tabs>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setDynamic(values => values.filter(item => item.value !== "middle"));
    }}>Remove middle tab</Button>
    <Button onClick={() => setDynamic([{ value: "first", label: "First" }, { value: "middle", label: "Middle" }, { value: "last", label: "Last" }])}>Restore dynamic tabs</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setDynamic([]);
    }}>Clear dynamic tabs</Button>
    <Tabs label="Dynamic settings" items={dynamic()} defaultValue="middle">{value => <Input label={`Dynamic ${value} draft`} />}</Tabs>
    <Tabs label="Automatic settings" items={items.map(item => item.value === "general" ? { ...item, label: label() } : item)}>{value => <Input label={`Automatic ${value} draft`} />}</Tabs>
    <Tabs label="Manual settings" items={items} activationMode="manual">{value => <Input label={`Manual ${value} draft`} />}</Tabs>
    <Tabs label="Controlled settings" items={items} value="general" onValueChange={setRequest}>{value => <Input label={`Controlled ${value} draft`} />}</Tabs>
    <output aria-label="Tab request">{request()}</output>
    <ThemeScope theme="paper" mode="light" direction="rtl">
      <Tabs label="RTL settings" items={items}>{value => <Input label={`RTL ${value} draft`} />}</Tabs>
      <Tabs label="Vertical settings" items={items} orientation="vertical">{value => <Input label={`Vertical ${value} draft`} />}</Tabs>
    </ThemeScope>
  </Stack></main>;
}
