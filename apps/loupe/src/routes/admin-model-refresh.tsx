import { Button, Stack } from "@gemologic/sheen";
import { StatGroup } from "@gemologic/sheen-charts/svg";
import { StatusBar } from "@gemologic/sheen-patterns";
import { AdminApp } from "@gemologic/sheen-patterns/admin";
import type { AdminAction, AdminActionGroup } from "@gemologic/sheen-patterns/admin";
import { createMemo, createSignal } from "solid-js";

export default function AdminModelRefreshFixture() {
  const [revision, setRevision] = createSignal(1);
  const [disabled, setDisabled] = createSignal(false);
  const [resourceAction, setResourceAction] = createSignal(false);
  const [committed, setCommitted] = createSignal(0);
  const actions = createMemo<readonly AdminActionGroup[]>(() => {
    const current = revision();
    const items: AdminAction[] = [
      { kind: "action", id: "commit", label: "Commit model", disabled: disabled(), onSelect: () => setCommitted(current) },
      resourceAction()
        ? { kind: "action", id: "resource", label: "Open resource", onSelect: () => setCommitted(current) }
        : { kind: "link", id: "resource", label: "Open resource", href: `/admin/accounts?revision=${current}` },
    ];
    return [{ id: "operations", label: `Model operations ${current}`, role: "primary", items }];
  });
  const counts = createMemo(() => {
    const current = revision();
    const values = [{ label: "Rows", value: current * 1000 }, { label: "Chart points", value: current * 2000 }];
    return current % 2 === 0 ? values.reverse() : values;
  });
  return <AdminApp label="Model refresh fixture" pathname="/admin-model-refresh" actionGroups={actions()} shortcutHelp={false}
    statusBar={<StatusBar counts={counts()} />}>
    <Stack>
      <Button onClick={() => setRevision(current => current + 1)}>Replace models</Button>
      <Button onClick={() => setDisabled(current => !current)}>Toggle disabled</Button>
      <Button onClick={() => setResourceAction(current => !current)}>Toggle action kind</Button>
      <output aria-label="Committed revision">{committed()}</output>
      <StatGroup label="Model metrics" stats={[{ label: "Requests", value: revision() * 1000 }, { label: "Errors", value: revision() }]} />
    </Stack>
  </AdminApp>;
}
