import { Badge, useTheme } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";
import { HomeIcon, InboxIcon, LockIcon, SettingsIcon, UnlockIcon, UsersIcon } from "@gemologic/sheen-icons";
import { StatusBar } from "@gemologic/sheen-patterns";
import { AdminApp } from "@gemologic/sheen-patterns/admin";
import type { AdminAccountModel, AdminActionGroup, AdminDetailsModel, AdminNavigationModel, AdminNotificationModel } from "@gemologic/sheen-patterns/admin";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { batch, createContext, createMemo, createSignal, onCleanup, useContext } from "solid-js";
import type { Accessor, JSX, ParentProps } from "solid-js";
import { bootstrap } from "./bootstrap.ts";
import { incidents } from "./lib/incidents.ts";
import type { Role } from "./lib/session.ts";

export interface DetailsRequest {
  readonly id: string;
  readonly title: string;
  /** Rendered under the console's owner so the details pane can read theme and console context. */
  readonly render: () => JSX.Element;
}

export interface ConsoleContextValue {
  readonly role: Accessor<Role>;
  /** Revocation applies synchronously; granting waits for the server session to confirm. */
  readonly changeRole: (role: Role) => Promise<void>;
  readonly liveInterval: Accessor<number>;
  readonly setLiveInterval: (milliseconds: number) => void;
  readonly showDetails: (details: DetailsRequest | undefined) => void;
  readonly setConnection: (state: "connected" | "degraded") => void;
}

const ConsoleContext = createContext<ConsoleContextValue>();

export function useConsole(): ConsoleContextValue {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error("useConsole requires the Console shell");
  return value;
}

const openIncidents = incidents.filter(incident => incident.status !== "Resolved");
const modes: readonly ThemeState["mode"][] = ["dark", "light", "system"];

export function Console(props: ParentProps) {
  const router = useSolidRouterAdapter();
  const theme = useTheme();
  const [role, setRole] = createSignal<Role>(bootstrap().role);
  const [rolePending, setRolePending] = createSignal(false);
  const [liveInterval, setLiveInterval] = createSignal(5_000);
  const [details, setDetails] = createSignal<DetailsRequest>();
  const [detailsOpen, setDetailsOpen] = createSignal(false);
  const [connection, setConnection] = createSignal<"connected" | "degraded">("connected");
  let session: AbortController | undefined;
  onCleanup(() => session?.abort());

  async function persistRole(next: Role, signal: AbortSignal): Promise<void> {
    const response = await fetch("/api/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: next }), signal });
    if (!response.ok) throw new Error(`Role change failed (${response.status})`);
  }

  async function changeRole(next: Role): Promise<void> {
    if (next === role() && !rolePending()) return;
    session?.abort();
    const controller = new AbortController();
    session = controller;
    if (next === "viewer") {
      // Unauthorized models and page content clear in the same batch, before any network round trip.
      batch(() => { setRole("viewer"); setDetails(undefined); setDetailsOpen(false); });
    }
    setRolePending(true);
    try {
      await persistRole(next, controller.signal);
      if (session === controller && next === "operator") setRole("operator");
    } finally {
      if (session === controller) { session = undefined; setRolePending(false); }
    }
  }

  const showDetails = (request: DetailsRequest | undefined): void => batch(() => {
    setDetails(request);
    setDetailsOpen(request !== undefined);
  });

  const pathname = createMemo(() => router.location().pathname);
  const operator = createMemo(() => role() === "operator");
  const incidentBadge = <Badge tone="warning">{openIncidents.length}</Badge>;
  const navigation = createMemo<AdminNavigationModel>(() => ({ id: "primary", label: "Primary navigation", items: [
    { kind: "link", id: "overview", label: "Overview", href: "/", match: "exact", icon: <HomeIcon decorative /> },
    ...(operator() ? [{ kind: "link" as const, id: "accounts", label: "Accounts", href: "/accounts", match: "prefix" as const, icon: <UsersIcon decorative /> }] : []),
    { kind: "link", id: "incidents", label: "Incidents", href: "/incidents", match: "prefix", icon: <InboxIcon decorative />, badge: incidentBadge },
    { kind: "link", id: "settings", label: "Settings", href: "/settings", match: "prefix", icon: <SettingsIcon decorative /> },
  ] }));

  const roleLabel = (): string => operator() ? "Switch to viewer role" : "Switch to operator role";
  const toggleRole = (): void => { void changeRole(operator() ? "viewer" : "operator").catch(() => setConnection("degraded")); };

  const actionGroups = createMemo<readonly AdminActionGroup[]>(() => [{ id: "session", label: "Session", role: "utility", items: [
    { kind: "action", id: "role", label: roleLabel(), icon: operator() ? <LockIcon decorative /> : <UnlockIcon decorative />, get disabled() { return rolePending(); }, onSelect: toggleRole },
  ] }]);

  const account = createMemo<AdminAccountModel>(() => ({
    id: "ada", name: "Ada Lovelace", email: operator() ? "Operator" : "Viewer (read only)", menuLabel: "Open account menu",
    items: [
      { kind: "action", id: "role", label: roleLabel(), onSelect: toggleRole },
      { kind: "action", id: "settings", label: "Console settings", onSelect: () => router.navigate("/settings") },
    ],
  }));

  const notifications = createMemo<AdminNotificationModel>(() => ({ label: "Open incidents", items: openIncidents.map(incident => ({
    kind: "link", id: incident.id, title: `${incident.id} · ${incident.severity}`, description: incident.title, href: `/incidents?incident=${incident.id}`,
  })) }));

  const cycleAccent = (): void => {
    const accents = theme.accents();
    void theme.setAccent(accents[(accents.indexOf(theme.accent()) + 1) % accents.length] ?? "jade");
  };
  const commandSources = createMemo(() => [{ kind: "static" as const, id: "console", commands: [
    { id: "go-overview", label: "Go to overview", group: "Navigation", run: () => router.navigate("/") },
    ...(operator() ? [{ id: "go-accounts", label: "Go to accounts", group: "Navigation", run: () => router.navigate("/accounts") }] : []),
    { id: "go-incidents", label: "Go to incidents", group: "Navigation", run: () => router.navigate("/incidents") },
    { id: "go-settings", label: "Go to settings", group: "Navigation", run: () => router.navigate("/settings") },
    ...modes.map(mode => ({ id: `mode-${mode}`, label: `Use ${mode} mode`, group: "Appearance", run: () => theme.setMode(mode) })),
    { id: "accent-next", label: "Cycle accent color", group: "Appearance", keywords: ["theme", "color"], run: cycleAccent },
    ...theme.themes().map(item => ({ id: `theme-${item.id}`, label: `Use ${item.label} theme`, group: "Appearance", run: () => theme.setTheme(item.id) })),
    { id: "role", label: roleLabel(), group: "Session", run: toggleRole },
  ] }]);

  const detailsContent = createMemo(() => details()?.render());
  const detailsModel = createMemo<AdminDetailsModel | undefined>(() => {
    const current = details();
    if (!current || !operator()) return undefined;
    return { id: current.id, title: current.title, content: detailsContent(), open: detailsOpen(), resizable: true, onOpenChange: setDetailsOpen };
  });

  const context: ConsoleContextValue = { role, changeRole, liveInterval, setLiveInterval, showDetails, setConnection };

  return <ConsoleContext.Provider value={context}>
    <AdminApp label="Operations console" documentTitle="Ops console · Sheen example" pathname={pathname()} router={router}
      product={{ name: "Ops console", href: "/", mark: <span>OC</span> }} primaryNavigation={navigation()} actionGroups={actionGroups()}
      account={account()} notifications={notifications()} commandPalette={{ label: "Command palette", sources: commandSources() }}
      details={detailsModel()} authorizationKey={role()} development={import.meta.env.DEV}
      statusBar={<StatusBar connection={connection()} tasks={rolePending() ? 1 : 0} counts={[{ label: "Open incidents", value: openIncidents.length }]}>
        <span data-testid="role-status">Role: {operator() ? "Operator" : "Viewer"}</span>
      </StatusBar>}>
      {props.children}
    </AdminApp>
  </ConsoleContext.Provider>;
}
