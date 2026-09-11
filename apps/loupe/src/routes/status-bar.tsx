import { createSignal } from "solid-js";
import { Button, Input, Stack, ThemeScope } from "@gemologic/sheen";
import { StatusBar } from "@gemologic/sheen-patterns";
import type { ConnectionState } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function StatusBarFixture() {
  const [connection, setConnection] = createSignal<ConnectionState>("connected");
  const [tasks, setTasks] = createSignal(2);
  const [german, setGerman] = createSignal(false);
  return <main><h1>Status bar qualification</h1><Stack>
    <Button onClick={() => { setConnection("disconnected"); setTasks(0); }}>Complete and disconnect</Button>
    <Button onClick={() => setGerman(value => !value)}>Toggle locale</Button>
    <ThemeScope locale={german() ? "de-DE" : "en-US"} messages={german() ? { disconnected: "Getrennt", connected: "Verbunden", backgroundTasks: "Hintergrundaufgaben" } : {}}>
      <StatusBar connection={connection()} tasks={tasks()} counts={[{ label: "Rows", value: 1234 }]}>
        <Input label="Status draft" />
        <Button onClick={() => { setConnection("connecting"); setTasks(1); }}>Retry connection</Button>
      </StatusBar>
    </ThemeScope>
    <StatusBar hidden label="Hidden status" connection="connected" />
    <div data-status-matrix style={{ display: "grid", gap: "16px" }}>
      <ThemeScope theme="obsidian" mode="dark"><StatusBar label="Dark workspace" connection="degraded" tasks={3} counts={[{ label: "Rows", value: 1234 }]} /></ThemeScope>
      <ThemeScope theme="paper" mode="light" direction="rtl"><StatusBar label="Light RTL workspace" connection="disconnected" tasks={1} counts={[{ label: "Rows", value: 1234 }]} /></ThemeScope>
    </div>
  </Stack></main>;
}
