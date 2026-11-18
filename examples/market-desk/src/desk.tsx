import { Heading, Link, Popover, Row, Select, Stack, Switch, Toaster, createToaster, useTheme } from "@gemologic/sheen";
import type { ToastController } from "@gemologic/sheen";
import { AppShell } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { createContext, createSignal, useContext } from "solid-js";
import type { Accessor, ParentProps } from "solid-js";

export interface DeskContextValue {
  readonly storm: Accessor<boolean>;
  /** IANA zone used for formatting only. Stored timestamps stay UTC epoch milliseconds. */
  readonly timeZone: Accessor<string>;
  readonly toasts: ToastController;
}

const DeskContext = createContext<DeskContextValue>();

export function useDesk(): DeskContextValue {
  const value = useContext(DeskContext);
  if (!value) throw new Error("useDesk requires the desk shell");
  return value;
}

const timeZones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "New York" },
  { value: "Europe/London", label: "London" },
  { value: "Asia/Tokyo", label: "Tokyo" },
];

const modes = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const views = [
  { href: "/", label: "Desk" },
  { href: "/analysis", label: "Analysis" },
];

function isMode(value: string): value is "dark" | "light" | "system" {
  return value === "dark" || value === "light" || value === "system";
}

export function DeskShell(props: ParentProps) {
  const router = useSolidRouterAdapter();
  const theme = useTheme();
  const toasts = createToaster();
  const [storm, setStorm] = createSignal(false);
  const [timeZone, setTimeZone] = createSignal("UTC");
  return <DeskContext.Provider value={{ storm, timeZone, toasts }}>
    <AppShell label="Trading desk" documentTitle="Market desk · Sheen example" router={router} shortcutHelp
      header={<Row class="md-header" gap="md" align="center" justify="between">
        <Row gap="lg" align="center">
          <Heading level={1} size="h3">Market desk</Heading>
          <nav class="md-views" aria-label="Desk views">
            {views.map(view => <Link href={view.href} variant="quiet" aria-current={router.location().pathname === view.href ? "page" : undefined}>{view.label}</Link>)}
          </nav>
        </Row>
        <Row gap="md" align="center">
          <Switch label="Tick storm" checked={storm()} onCheckedChange={setStorm} />
          <Popover trigger={`Display · ${timeZone()}`} title="Display" placement="bottom-end">
            <Stack gap="md">
              <Select class="md-mode" label="Color mode" value={theme.mode()} options={modes} onValueChange={value => { if (value && isMode(value)) void theme.setMode(value); }} />
              <Select class="md-zone" label="Display timezone" value={timeZone()} options={timeZones} onValueChange={value => { if (value) setTimeZone(value); }} />
            </Stack>
          </Popover>
        </Row>
      </Row>}>
      {props.children}
    </AppShell>
    <Toaster controller={toasts} label="Order notifications" />
  </DeskContext.Provider>;
}
