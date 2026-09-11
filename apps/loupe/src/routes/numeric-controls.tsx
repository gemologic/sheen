import { createSignal } from "solid-js";
import { Button, NumberField, RangeSlider, Slider, ThemeScope } from "@gemologic/sheen";

export default function NumericControlsFixture() {
  const [budget, setBudget] = createSignal<number | null>(1234.5);
  const [threshold, setThreshold] = createSignal(25);
  const [window, setWindow] = createSignal<readonly [number, number]>([20, 80]);
  const [pending, setPending] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  async function refresh(): Promise<void> {
    if (pending()) return;
    setPending(true);
    try {
      const response = await fetch(`/api/numeric-controls?revision=${revision() + 1}&delay=300`);
      if (!response.ok) throw new Error(`Numeric control refresh failed (${response.status})`);
      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null || !("revision" in payload) || typeof payload.revision !== "number") throw new Error("Invalid numeric control response");
      setRevision(payload.revision);
    } finally { setPending(false); }
  }
  return <main class="loupe-numeric-page">
    <h1>Numeric controls</h1>
    <div class="actions"><Button disabled={pending()} onClick={() => void refresh()}>Refresh constraints</Button><output role="status" aria-live="polite">{pending() ? "Refreshing constraints" : `Accepted revision ${revision()}`}</output></div>
    <ThemeScope locale="de-DE" class="loupe-numeric-surface">
      <NumberField label="Budget" value={budget()} onValueChange={setBudget} min={0} max={10_000} step={0.5} largeStep={10}
        formatOptions={{ style: "currency", currency: "EUR" }} name="budget" description="Monthly infrastructure budget" />
      <output aria-label="Raw budget">{budget() ?? "empty"}</output>
      <Slider label="Threshold" value={threshold()} onValueChange={setThreshold} min={0} max={100} step={5} name="threshold" description="Alert percentage" />
      <output aria-label="Raw threshold">{threshold()}</output>
      <RangeSlider label="Window" value={window()} onValueChange={setWindow} min={0} max={100} step={5} minStepsBetweenThumbs={2} description="Accepted percentile interval" />
      <output aria-label="Raw window">{window().join(",")}</output>
    </ThemeScope>
  </main>;
}
