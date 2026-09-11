import { createSignal } from "solid-js";
import { Button, ButtonGroup } from "@gemologic/sheen";

export default function ButtonGroupFixture() {
  const [count, setCount] = createSignal(0);
  const [vertical, setVertical] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [narrow, setNarrow] = createSignal(false);
  return <main>
    <Button>Before group</Button>
    <div style={{ "inline-size": narrow() ? "12rem" : "100%" }}><ButtonGroup dir={rtl() ? "rtl" : "ltr"} label="Editing actions" orientation={vertical() ? "vertical" : "horizontal"}>
      <Button onClick={() => setCount(value => value + 1)}>Save action</Button>
      <Button disabled>Unavailable action</Button>
      <Button onClick={() => setCount(value => value - 1)}>Discard action</Button>
    </ButtonGroup></div>
    <Button onClick={() => setVertical(value => !value)}>Toggle group layout</Button>
    <output aria-label="Action count">{count()}</output>
    <Button onClick={() => setRtl(value => !value)}>Toggle group direction</Button>
    <Button onClick={() => setNarrow(value => !value)}>Toggle group width</Button>
  </main>;
}
