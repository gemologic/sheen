import { For, createSignal } from "solid-js";
import { Button, Input, ScrollArea, Stack, ThemeScope } from "@gemologic/sheen";

const rows = Array.from({ length: 60 }, (_, index) => index + 1);
export default function ScrollAreaFixture() {
  const [suffix, setSuffix] = createSignal("initial");
  const [height, setHeight] = createSignal(240);
  return <main><h1>Scroll viewport qualification</h1><Stack>
    <Button onClick={() => setSuffix("refreshed")}>Refresh content</Button>
    <Button onClick={() => setHeight(value => value === 240 ? 360 : 240)}>Resize viewport</Button>
    <Input label="Outside draft" />
    <ScrollArea label="Activity" style={{ height: `${height()}px` }}>
      <Input label="Activity draft" />
      <For each={rows}>{row => <p>Activity {row}: {suffix()}</p>}</For>
    </ScrollArea>
    <ThemeScope theme="paper" mode="light" direction="rtl">
      <ScrollArea label="Horizontal timeline" orientation="horizontal" style={{ height: "90px" }}>
        <div style={{ width: "1600px", display: "flex", "justify-content": "space-between" }}><span>Timeline start</span><span>Timeline end</span></div>
      </ScrollArea>
    </ThemeScope>
  </Stack></main>;
}
