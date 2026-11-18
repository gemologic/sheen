import { Select, Stack, Switch, Text, useTheme } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";
import { SettingsLayout } from "@gemologic/sheen-patterns";
import { useAdminServices } from "@gemologic/sheen-patterns/admin";
import { accentNames, isAccentName } from "@gemologic/sheen-tokens";
import { createMemo, createSignal } from "solid-js";
import { useConsole } from "../console.tsx";

interface Preferences {
  readonly liveInterval: string;
  readonly incidentDigest: boolean;
  readonly pageOnSev1: boolean;
}

const intervalOptions = [
  { value: "2000", label: "Every 2 seconds" },
  { value: "5000", label: "Every 5 seconds" },
  { value: "15000", label: "Every 15 seconds" },
  { value: "0", label: "Paused" },
];
const modeOptions = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];

function isMode(value: string | null): value is ThemeState["mode"] {
  return value === "dark" || value === "light" || value === "system";
}

export default function Settings() {
  const theme = useTheme();
  const shell = useConsole();
  const services = useAdminServices();
  const initial = (): Preferences => ({ liveInterval: String(shell.liveInterval()), incidentDigest: true, pageOnSev1: true });
  const [saved, setSaved] = createSignal<Preferences>(initial());
  const [draft, setDraft] = createSignal<Preferences>(initial());
  const dirty = createMemo(() => JSON.stringify(draft()) !== JSON.stringify(saved()));
  const themeOptions = createMemo(() => theme.themes().map(item => ({ value: item.id, label: item.label })));
  const accentOptions = accentNames.map(accent => ({ value: accent, label: accent.charAt(0).toUpperCase() + accent.slice(1) }));

  const sections = [
    { id: "appearance", label: "Appearance", description: "Theme, accent, and mode are independent and apply immediately.", content: <Stack gap="md">
      <Select label="Theme" value={theme.theme()} options={themeOptions()} onValueChange={value => { if (value) void theme.setTheme(value); }} />
      <Select label="Accent" value={theme.accent()} options={accentOptions} onValueChange={value => { if (value && isAccentName(value)) void theme.setAccent(value); }} />
      <Select label="Mode" value={theme.mode()} options={modeOptions} onValueChange={value => { if (isMode(value)) void theme.setMode(value); }} />
    </Stack> },
    { id: "revalidation", label: "Live data", description: "How often accepted account rows and incident timelines revalidate in the background.", content: <Stack gap="md">
      <Select label="Background revalidation" value={draft().liveInterval} options={intervalOptions} onValueChange={value => { if (value) setDraft(previous => ({ ...previous, liveInterval: value })); }} />
      <Text tone="muted" size="caption">Revalidation never replaces accepted rows; it updates their live fields in place.</Text>
    </Stack> },
    { id: "notifications", label: "Notifications", description: "Demo preferences saved for this browser session.", content: <Stack gap="md">
      <Switch label="Daily incident digest" checked={draft().incidentDigest} onCheckedChange={incidentDigest => setDraft(previous => ({ ...previous, incidentDigest }))} />
      <Switch label="Page me for SEV1 incidents" checked={draft().pageOnSev1} onCheckedChange={pageOnSev1 => setDraft(previous => ({ ...previous, pageOnSev1 }))} />
    </Stack> },
  ];

  return <div class="ops-fill">
    <SettingsLayout label="Console settings" sections={sections} dirty={dirty()} onDiscard={() => setDraft(saved())} onSave={() => {
      const next = draft();
      shell.setLiveInterval(Number(next.liveInterval));
      setSaved(next);
      services.toasts.show({ title: "Settings saved", tone: "success" });
    }} />
  </div>;
}
