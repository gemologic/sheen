import { createSignal } from "solid-js";
import { Button, Input, useTheme } from "@gemologic/sheen";

export default function CookiePreview() {
  const theme = useTheme();
  const [status, setStatus] = createSignal("Ready");
  async function toggle(): Promise<void> {
    setStatus("Saving");
    try { await theme.set({ mode: theme.resolvedMode() === "dark" ? "light" : "dark" }); setStatus("Saved"); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Persistence failed"); }
  }
  return <main><h1>Cookie hydration</h1><Input label="Cookie draft" /><Button onClick={() => void toggle()}>Persist mode</Button><output aria-live="polite">{status()}</output></main>;
}
