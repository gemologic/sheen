import { Show, createSignal } from "solid-js";
import { Button, Input, Stack, ThemeScope } from "@gemologic/sheen";
import { ErrorState } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function ErrorStateFixture() {
  const [attempts, setAttempts] = createSignal(0);
  const [reject, setReject] = createSignal(true);
  const [visible, setVisible] = createSignal(true);
  const retry = async () => {
    setAttempts(value => value + 1);
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
    if (!response.ok) throw new Error("Private transport details must not render");
  };
  return <main><h1>Regional errors</h1><Stack>
    <Input label="Retained content draft" />
    <Button onClick={() => setReject(false)}>Allow retry success</Button>
    <Button onClick={() => setVisible(value => !value)}>Toggle error region</Button>
    <output aria-label="Retry attempts">{attempts()}</output>
    <Show when={visible()}><ErrorState title="Orders refresh failed" description="Existing orders are still available." onRetry={retry}><Input label="Error action draft" /></ErrorState></Show>
    <ErrorState title="Hidden error" hidden />
    <div data-error-matrix style={{ display: "grid", gap: "16px" }}>
      <ThemeScope theme="obsidian" mode="dark"><ErrorState kind="not-found" description="This item is no longer available." /></ThemeScope>
      <ThemeScope theme="paper" mode="light" direction="rtl" messages={{ permissionDenied: "Access denied" }}><ErrorState kind="permission-denied" description="Contact your workspace administrator." /></ThemeScope>
    </div>
  </Stack></main>;
}
