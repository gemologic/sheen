import { Badge, Button, Heading, Row, ThemeProvider, useTheme } from "@gemologic/sheen/core";
import type { StatusTone } from "@gemologic/sheen/core";
import { MoonIcon, SunIcon, UsersIcon } from "@gemologic/sheen-icons";
import { AppShell, PageHeader, SidebarNav } from "@gemologic/sheen-patterns";
import type { SidebarNavSection } from "@gemologic/sheen-patterns";
import { DataTable, defineColumns } from "@gemologic/sheen-table";

type Status = "Active" | "Trial" | "Suspended";

interface Account {
  readonly id: string;
  readonly name: string;
  readonly plan: "Starter" | "Team" | "Enterprise";
  readonly status: Status;
  readonly seats: number;
}

const names: readonly string[] = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Vandelay", "Stark", "Wayne", "Tyrell", "Cyberdyne", "Soylent", "Wonka"];
const plans: readonly Account["plan"][] = ["Starter", "Team", "Enterprise"];
const statuses: readonly Status[] = ["Active", "Active", "Trial", "Suspended"];
const tones: Record<Status, StatusTone> = { Active: "success", Trial: "info", Suspended: "warning" };

/** A complete, bounded in-memory dataset with stable IDs, so continuous client mode applies. */
const accounts: readonly Account[] = Array.from({ length: 24 }, (_, index) => ({
  id: `AC-${String(index + 1).padStart(4, "0")}`,
  name: `${names[index % names.length] ?? "Account"} ${index < names.length ? "Labs" : "Group"}`,
  plan: plans[index % plans.length] ?? "Starter",
  status: statuses[index % statuses.length] ?? "Active",
  seats: ((index * 37) % 180) + 5,
}));

const columns = defineColumns<Account>([
  { id: "id", header: "ID", accessor: row => row.id, width: 112, search: true },
  { id: "name", header: "Name", accessor: row => row.name, width: "fill", minWidth: 160, search: true },
  { id: "plan", header: "Plan", accessor: row => row.plan, width: 128 },
  { id: "status", header: "Status", accessor: row => row.status, width: 128, cellDependencies: [],
    cell: (_value, row) => <Badge tone={tones[row.status]} size="sm">{row.status}</Badge> },
  { id: "seats", header: "Seats", accessor: row => row.seats, numeric: true, sort: "number", width: 96 },
]);

function ModeToggle() {
  const theme = useTheme();
  const next = () => theme.resolvedMode() === "dark" ? "light" : "dark";
  return <Button variant="ghost" onClick={() => { void theme.setMode(next()); }}>
    {next() === "light" ? <SunIcon decorative /> : <MoonIcon decorative />}
    {next() === "light" ? "Light mode" : "Dark mode"}
  </Button>;
}

export function App() {
  const navigation: readonly SidebarNavSection[] = [
    { id: "workspace", label: "Workspace", items: [{ kind: "link", id: "accounts", label: "Accounts", href: "/", match: "exact", icon: <UsersIcon decorative /> }] },
  ];
  return <ThemeProvider hydration="client" defaultMode="dark">
    <AppShell label="Accounts"
      header={<Row class="spa-header" gap="md" align="center" justify="between">
        <Heading level={2} size="h4">Sheen SPA</Heading>
        <ModeToggle />
      </Row>}
      sidebar={<SidebarNav sections={navigation} pathname={window.location.pathname} />}>
      <div class="spa-page">
        <PageHeader title="Accounts" />
        <DataTable data={accounts} columns={columns} getRowId={row => row.id} caption="Accounts" pagination={false}
          search={{ placeholder: "Search accounts" }} filterBar={false} export={false} initialViewportHeight={480} />
      </div>
    </AppShell>
  </ThemeProvider>;
}
