import { Button, Card, Heading, Stack, Text, ThemeScope } from "@gemologic/sheen";
import { AccountMenu, NotificationCenter, WorkspaceSwitcher } from "@gemologic/sheen-patterns/admin";
import type { AdminAccountModel, AdminNotificationModel, AdminWorkspaceModel } from "@gemologic/sheen-patterns/admin";
import { createMemo, createSignal } from "solid-js";

type Operation = "idle" | "pending" | "accepted" | "failed";

export default function AdminControlsGallery() {
  const [workspaceId, setWorkspaceId] = createSignal("northstar");
  const [read, setRead] = createSignal<ReadonlySet<string>>(new Set(["maintenance"]));
  const [revision, setRevision] = createSignal(0);
  const [operation, setOperation] = createSignal<Operation>("idle");
  const post = async (action: "workspace" | "account" | "notification" | "mark-all-read", id?: string): Promise<boolean> => {
    setOperation("pending");
    try {
      const response = await fetch("/api/admin-controls", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(id === undefined ? { action } : { action, id }) });
      if (!response.ok) throw new Error(`Admin control operation failed (${response.status})`);
      setOperation("accepted");
      return true;
    } catch { setOperation("failed"); return false; }
  };
  const account = createMemo<AdminAccountModel>(() => ({
    id: "ada", name: "Ada Lovelace", email: revision() === 0 ? "ada@gemologic.dev" : "ada+verified@gemologic.dev", avatarFallback: "AL",
    items: [
      { kind: "action", id: "profile", label: "Open profile", onSelect: () => void post("account", "profile") },
      { kind: "action", id: "lock", label: "Lock session", onSelect: () => void post("account", "lock") },
    ],
  }));
  const workspace = createMemo<AdminWorkspaceModel>(() => ({
    label: "Workspace", currentId: workspaceId(),
    items: [{ id: "northstar", label: "Northstar", description: "Production" }, { id: "forge", label: "Forge", description: "Development" }, { id: "archive", label: "Archive", disabled: true }],
    onChange: id => { void post("workspace", id).then(accepted => { if (accepted) setWorkspaceId(id); }); },
  }));
  const notifications = createMemo<AdminNotificationModel>(() => ({
    label: "Notifications",
    items: [
      { kind: "link", id: "deploy", title: revision() === 0 ? "Deploy finished" : "Deploy evidence verified", description: "Release 2026.09.09 is live.", timeLabel: "2 minutes ago", href: "#deployment", read: read().has("deploy") },
      { kind: "action", id: "review", title: "Review requested", description: "Two access grants need an owner.", timeLabel: "18 minutes ago", read: read().has("review"), onSelect: () => void post("notification", "review").then(accepted => { if (accepted) setRead(current => new Set([...current, "review"])); }) },
      { kind: "action", id: "maintenance", title: "Maintenance completed", timeLabel: "Yesterday", read: true, onSelect: () => void post("notification", "maintenance") },
    ],
    onMarkAllRead: () => void post("mark-all-read").then(accepted => { if (accepted) setRead(new Set(["deploy", "review", "maintenance"])); }),
  }));
  const refresh = async (): Promise<void> => {
    if (operation() === "pending") return;
    setOperation("pending");
    try {
      const response = await fetch(`/api/admin-controls?revision=${revision() + 1}&delay=400`);
      if (!response.ok) throw new Error(`Admin controls refresh failed (${response.status})`);
      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null || !("revision" in payload) || typeof payload.revision !== "number") throw new Error("Invalid admin controls response");
      setRevision(payload.revision);
      setOperation("accepted");
    } catch { setOperation("failed"); }
  };
  return <main class="loupe-admin-controls-gallery"><header><div><Heading level={1}>Application identity controls</Heading><Text tone="muted">Account, workspace, and notification scenarios with application-owned adapters and state.</Text></div><div class="actions"><Button disabled={operation() === "pending"} onClick={() => void refresh()}>Refresh controls</Button><output aria-label="Control operation">{operation()}</output></div></header>
    <div class="loupe-admin-controls-grid">
      <Card><Stack><Heading level={2} size="h3">Account menu</Heading><Text tone="muted">Topbar alignment, identity refresh, and app-owned session actions.</Text><div class="loupe-admin-control-topbar"><AccountMenu account={account()} target="topbar-end" /></div></Stack></Card>
      <Card><Stack><Heading level={2} size="h3">Workspace switcher</Heading><Text tone="muted">Sidebar-header selection persisted only by the fixture adapter.</Text><div class="loupe-admin-control-sidebar"><WorkspaceSwitcher workspace={workspace()} target="sidebar-header" /></div></Stack></Card>
      <Card><Stack><Heading level={2} size="h3">Notification center</Heading><Text tone="muted">Unread text, native destinations, and app-owned mark/read operations.</Text><div class="loupe-admin-control-topbar"><NotificationCenter notifications={notifications()} target="topbar-end" /></div></Stack></Card>
      <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-admin-controls-scope"><Stack><Heading level={2} size="h3">Sidebar-footer variants</Heading><WorkspaceSwitcher workspace={workspace()} target="sidebar-footer" /><NotificationCenter notifications={notifications()} target="sidebar-footer" /><AccountMenu account={account()} target="sidebar-footer" /></Stack></ThemeScope>
    </div>
  </main>;
}
