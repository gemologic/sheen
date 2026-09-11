import { Button, Stack } from "@gemologic/sheen";
import { DiffViewer } from "@gemologic/sheen-code/diff-viewer";
import { JSONViewer } from "@gemologic/sheen-code/json-viewer";
import { LogViewer } from "@gemologic/sheen-code/log-viewer";
import type { LogEntry } from "@gemologic/sheen-code/log-viewer";
import { createSignal } from "solid-js";

const initialLogs: readonly LogEntry[] = Object.freeze(Array.from({ length: 5_000 }, (_, index): LogEntry => Object.freeze({
  id: `log-${index}`,
  timestamp: `2026-09-09T12:${String(Math.floor(index / 60) % 60).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}Z`,
  level: index === 4_321 ? "error" : index % 97 === 0 ? "warn" : "info",
  message: index === 4_321 ? "Fatal marker while applying revision" : `Processed record ${index}`,
  ...(index % 113 === 0 ? { details: `worker=${index % 8} revision=${1_800 + index}` } : {}),
})));
const before = Array.from({ length: 2_000 }, (_, index) => `setting.${index} = ${index}`).join("\n");
const after = Array.from({ length: 2_000 }, (_, index) => `setting.${index} = ${index === 1_337 ? "changed" : index}`).join("\n");
const jsonValue = Object.freeze({
  status: "ready",
  generatedAt: "2026-09-09T12:00:00Z",
  records: Object.freeze(Array.from({ length: 1_200 }, (_, index) => Object.freeze({ id: `record-${index}`, active: index % 7 !== 0, amount: index * 12.5, owner: `Operator ${index % 24}` }))),
});

export default function AdvancedViewersFixture() {
  const [logs, setLogs] = createSignal(initialLogs);
  const refresh = (): void => { setLogs(current => Object.freeze([...current, Object.freeze({ id: "log-refresh", timestamp: "2026-09-09T14:00:00Z", level: "info", message: "Refresh accepted" })])); };
  return <main>
    <Stack gap="xl">
      <header><h1>Advanced viewers</h1><p>Large accepted content stays searchable and copyable without producing one DOM node per line.</p></header>
      <section aria-labelledby="log-heading"><h2 id="log-heading">Logs</h2><Button onClick={refresh}>Append accepted log</Button><LogViewer entries={logs()} label="Worker logs" initialHeight={280} /></section>
      <section aria-labelledby="diff-heading"><h2 id="diff-heading">Diff</h2><DiffViewer oldText={before} newText={after} label="Configuration diff" oldLabel="before.conf" newLabel="after.conf" initialHeight={280} /></section>
      <section aria-labelledby="json-heading"><h2 id="json-heading">JSON</h2><JSONViewer value={jsonValue} label="API response" initialHeight={280} /></section>
    </Stack>
  </main>;
}
