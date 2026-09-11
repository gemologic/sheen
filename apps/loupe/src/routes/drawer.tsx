import { Button, Drawer, Input, Sheet, Text, ThemeScope } from "@gemologic/sheen";
import { createSignal } from "solid-js";

export default function DrawerFixture() {
  const [rtl, setRtl] = createSignal(false);
  return <main>
    <h1>Drawer and Sheet</h1>
    <Button onClick={() => setRtl(value => !value)}>Toggle panel direction</Button>
    <ThemeScope theme="paper" mode="light" direction={rtl() ? "rtl" : "ltr"}>
      <Drawer title="Start panel" description="Scoped start-side content" trigger="Open start drawer" side="start"><Input label="Drawer field" /></Drawer>
      <Sheet title="End panel" trigger="Open end sheet"><Text>End-side task details</Text></Sheet>
    </ThemeScope>
  </main>;
}
