import { For, createSignal } from "solid-js";
import { Button, ScrollArea, ThemeScope } from "@gemologic/sheen";
import { AppShell, PageHeader } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

const rows = Array.from({ length: 60 }, (_, index) => index + 1);

export default function WideSidebarFixture() {
  const [rtl, setRtl] = createSignal(false);
  const [revision, setRevision] = createSignal(0);
  const [compact, setCompact] = createSignal(false);
  const [reduced, setReduced] = createSignal(false);
  const [light, setLight] = createSignal(false);
  return <ThemeScope theme={light() ? "paper" : "obsidian"} mode={light() ? "light" : "dark"} direction={rtl() ? "rtl" : "ltr"} motion={reduced() ? "reduced" : "full"}>
    <AppShell label="Wide sidebar workspace"
      header={<PageHeader title="Wide sidebar" actions={<>
        <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
        <Button onClick={() => setRevision(value => value + 1)}>Refresh sidebar</Button>
        <Button onClick={() => setCompact(value => !value)}>{compact() ? "Restore sidebar data" : "Shrink sidebar data"}</Button>
      </>} />}
      sidebar={<ScrollArea label="Wide sidebar data" orientation="both">
        <div style={{ "min-inline-size": compact() ? "30rem" : "80rem" }}><For each={compact() ? rows.slice(0, 10) : rows}>{row => <p>Record {row}, revision {revision()}</p>}</For></div>
      </ScrollArea>}>
      <p>Both axes belong to the sidebar pane.</p>
      <Button onClick={() => setReduced(value => !value)}>Toggle scoped motion</Button>
      <Button onClick={() => setLight(value => !value)}>Toggle fixture palette</Button>
    </AppShell>
  </ThemeScope>;
}
