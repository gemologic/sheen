import { createSignal } from "solid-js";
import { Checkbox, Input, Select, Stack, Text } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { AppShell, SettingsLayout } from "@gemologic/sheen-patterns";
import type { SettingsLayoutSection } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { GalleryScenario } from "../../gallery-scenario.tsx";

const timezones: readonly SelectOption[] = [{ value: "UTC", label: "UTC" }, { value: "America/New_York", label: "New York" }, { value: "Asia/Tokyo", label: "Tokyo" }];

export default function SettingsGallery() {
  const router = useSolidRouterAdapter();
  const [name, setName] = createSignal("Ada Lovelace");
  const [savedName, setSavedName] = createSignal("Ada Lovelace");
  const [timezone, setTimezone] = createSignal("UTC");
  const [savedTimezone, setSavedTimezone] = createSignal("UTC");
  const [alerts, setAlerts] = createSignal(true);
  const [savedAlerts, setSavedAlerts] = createSignal(true);
  const dirty = () => name() !== savedName() || timezone() !== savedTimezone() || alerts() !== savedAlerts();
  const sections = (): readonly SettingsLayoutSection[] => [
    { id: "profile", label: "Profile", description: "Identity shown to collaborators.", content: <Stack><Input label="Display name" value={name()} onInput={event => setName(event.currentTarget.value)} /><Input label="Role" value="Systems designer" /></Stack> },
    { id: "regional", label: "Regional", description: "Formatting stays explicit across server and client.", content: <Select label="Timezone" value={timezone()} options={timezones} onValueChange={value => { if (value) setTimezone(value); }} /> },
    { id: "notifications", label: "Notifications", description: "Delivery is application-owned.", content: <Checkbox label="Send operational alerts" checked={alerts()} onCheckedChange={setAlerts} /> },
  ];
  const save = async (): Promise<void> => {
    await new Promise<void>(resolve => setTimeout(resolve, 450));
    setSavedName(name());
    setSavedTimezone(timezone());
    setSavedAlerts(alerts());
  };
  const discard = (): void => {
    setName(savedName());
    setTimezone(savedTimezone());
    setAlerts(savedAlerts());
  };
  return <AppShell router={router} label="Settings gallery" header={<strong>Loupe settings scenario</strong>}><GalleryScenario insideShell path="/gallery/settings" title="Workspace settings" description="Multi-section preferences with explicit dirty, save, discard, and retained-refresh behavior." emptyHeading="No settings available" emptyDescription="This account has no configurable settings.">
    {revision => <><Text tone="muted">Accepted settings revision {revision()}</Text><SettingsLayout label="Workspace settings" sections={sections()} dirty={dirty()} onSave={save} onDiscard={discard} /></>}
  </GalleryScenario></AppShell>;
}
