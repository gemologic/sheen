import { createSignal } from "solid-js";
import { Button, ThemeScope, useTheme } from "@gemologic/sheen";

function ScopeControls(props: { label: string }) {
  const theme = useTheme();
  const [result, setResult] = createSignal("Unchanged");
  async function change(): Promise<void> {
    try { await theme.set({ accent: "violet", density: "compact", mode: "light" }); setResult("Changed"); }
    catch (error) { setResult(error instanceof Error ? error.message : "Rejected"); }
  }
  return <div aria-label={props.label} role="group">
    <Button onClick={() => void change()}>Change {props.label}</Button>
    <output>{result()}</output>
  </div>;
}

export default function ScopePreview() {
  return <main><h1>Theme scope contract</h1>
    <ScopeControls label="root" />
    <ThemeScope theme="paper" class="read-only-scope"><ScopeControls label="read only" /></ThemeScope>
    <ThemeScope theme="graphite" controllable class="controllable-scope"><ScopeControls label="local" />
      <ThemeScope accent={null} mode={null} class="reset-scope"><p>Provider defaults restored here</p></ThemeScope>
    </ThemeScope>
  </main>;
}
