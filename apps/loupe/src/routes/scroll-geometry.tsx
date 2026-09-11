import { Show, createSignal } from "solid-js";
import { Button, ScrollArea, Stack } from "@gemologic/sheen";

export default function ScrollGeometryFixture() {
  const [rtl, setRtl] = createSignal(false);
  const [scaled, setScaled] = createSignal(false);
  const [contentHeight, setContentHeight] = createSignal(900);
  const [visible, setVisible] = createSignal(true);
  return <main><h1>Scroll geometry qualification</h1><Stack>
    <Button onClick={() => setRtl(value => !value)}>Toggle viewport direction</Button>
    <Button onClick={() => setScaled(value => !value)}>Toggle scale</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setContentHeight(80);
    }}>Shrink content after request</Button>
    <Button onClick={() => setContentHeight(900)}>Restore content height</Button>
    <Button onClick={async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (response.ok) setVisible(false);
    }}>Remove viewport after request</Button>
    <Button onClick={() => setVisible(true)}>Restore viewport</Button>
    <div style={{ transform: scaled() ? "scale(0.75)" : "none", "transform-origin": "top left" }}>
    <Show when={visible()}>
    <ScrollArea label="Bounded canvas" orientation="both" dir={rtl() ? "rtl" : "ltr"} style={{ width: "400px", height: "240px", border: "6px solid currentColor" }}>
      <div style={{ width: "1200px", height: `${contentHeight()}px` }}>Canvas content</div>
    </ScrollArea>
    </Show>
    </div>
  </Stack></main>;
}
