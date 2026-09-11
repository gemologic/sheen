import { ActivityTimeline, Button, Stack, Stepper, Surface, ThemeScope } from "@gemologic/sheen";
import type { ActivityTimelineItem, StepperStep } from "@gemologic/sheen";
import { createMemo, createSignal } from "solid-js";

function activities(revision: number): readonly ActivityTimelineItem[] {
  return [
    { id: "request", title: "Deployment requested", description: "Release 2026.09.09 entered the production workflow.", actor: "Avery Chen", timestamp: "2026-09-09T13:42:00Z", timeLabel: "9:42 AM", state: "completed" },
    { id: "approval", title: revision === 0 ? "Security approval pending" : "Security approval completed", description: "Policy and dependency evidence retained while the accepted status refreshes.", actor: "Release controls", timestamp: "2026-09-09T13:48:00Z", timeLabel: "9:48 AM", state: revision === 0 ? "current" : "completed" },
    { id: "deploy", title: revision === 0 ? "Production deployment queued" : "Production deployment running", description: "This intentionally-long-deployment-environment-identifier-wraps-without-widening-the-workspace.", state: revision === 0 ? "upcoming" : "current" },
    { id: "audit", title: "Audit sink unavailable", description: "Retry is required before the release can close.", state: "error" },
  ];
}

export default function WorkflowFixture() {
  const [revision, setRevision] = createSignal(0);
  const [refreshing, setRefreshing] = createSignal(false);
  const [actionCount, setActionCount] = createSignal(0);
  const timeline = createMemo(() => activities(revision()));
  const steps = createMemo<readonly StepperStep[]>(() => [
    { kind: "status", id: "request", label: "Request", description: "Release created", state: "completed" },
    { kind: "action", id: "approval", label: "Configure approval", description: "Policy controls", state: revision() === 0 ? "current" : "completed", onSelect: () => setActionCount(count => count + 1) },
    { kind: "link", id: "deploy", label: "Review deployment", description: "Production rollout", state: revision() === 0 ? "upcoming" : "current", href: "#deployment" },
    { kind: "status", id: "audit", label: "Close audit", description: "Blocked by sink", state: "error" },
  ]);
  const refresh = async (): Promise<void> => {
    if (refreshing()) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/workflow?revision=${revision() + 1}&delay=400`);
      if (!response.ok) throw new Error(`Workflow refresh failed (${response.status})`);
      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null || !("revision" in payload) || typeof payload.revision !== "number") throw new Error("Invalid workflow response");
      setRevision(payload.revision);
    } finally { setRefreshing(false); }
  };
  return <main class="loupe-workflow-page"><header><h1>ActivityTimeline and Stepper</h1><div class="actions"><Button disabled={refreshing()} onClick={() => void refresh()}>Refresh workflow</Button><output aria-label="Workflow revision">Revision {revision()}</output><output aria-label="Configure actions">{actionCount()}</output></div></header>
    <Stack><Surface padding="lg"><Stepper label="Release workflow" steps={steps()} refreshing={refreshing()} /></Surface>
      <div class="loupe-workflow-columns"><Surface padding="lg"><h2>Activity</h2><ActivityTimeline label="Release activity" items={timeline()} refreshing={refreshing()} /></Surface>
        <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-workflow-scope"><h2>Compact RTL</h2><ActivityTimeline label="Compact release activity" items={timeline()} density="compact" /></ThemeScope></div>
      <Surface padding="lg" class="loupe-workflow-narrow"><Stepper label="Narrow workflow" steps={steps()} density="compact" /></Surface>
    </Stack>
  </main>;
}
