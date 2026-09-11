import { Show, createSignal } from "solid-js";
import { Button, Input, Skeleton, Stack, ThemeScope } from "@gemologic/sheen";
import { LoadingState } from "@gemologic/sheen-patterns";
import type { LoadingStateProps } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function LoadingStateFixture() {
  const [phase, setPhase] = createSignal<LoadingStateProps["phase"]>("idle");
  const [result, setResult] = createSignal("Initial orders");
  const [reduced, setReduced] = createSignal(false);
  const [visible, setVisible] = createSignal(true);
  const request = async (next: "cold" | "refresh", reject: boolean) => {
    setPhase(next);
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject }) });
    if (response.ok) setResult("Updated orders");
    setPhase("idle");
  };
  return <main><h1>Regional loading</h1><Stack>
    <Button onClick={() => { void request("cold", false); }}>Cold request</Button>
    <Button onClick={() => { void request("refresh", false); }}>Refresh request</Button>
    <Button onClick={() => { void request("refresh", true); }}>Fail refresh</Button>
    <Button onClick={() => { setPhase("refresh"); queueMicrotask(() => setPhase("idle")); }}>Immediate refresh</Button>
    <Button onClick={() => setReduced(value => !value)}>Toggle reduced motion</Button>
    <Button onClick={() => setPhase("cold")}>Hold cold</Button>
    <Button onClick={() => setPhase("refresh")}>Hold refresh</Button>
    <Button onClick={() => setPhase("idle")}>Finish loading</Button>
    <Button onClick={() => setVisible(value => !value)}>Toggle loading region</Button>
    <ThemeScope motion={reduced() ? "reduced" : "full"}>
      <Show when={visible()}>
      <LoadingState label="Orders" phase={phase()} fallback={<Skeleton shape="rectangle" style={{ height: "180px", width: "100%" }} />}>
        <div style={{ height: "180px" }}><Input label="Order draft" /><p>{result()}</p></div>
      </LoadingState>
      </Show>
    </ThemeScope>
  </Stack></main>;
}
