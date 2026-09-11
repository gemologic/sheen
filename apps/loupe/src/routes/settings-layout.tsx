import { A } from "@solidjs/router";
import { Checkbox, Input } from "@gemologic/sheen";
import { AppShell, PageHeader, SettingsLayout, StatusBar } from "@gemologic/sheen-patterns";
import type { SettingsLayoutSection } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { createSignal } from "solid-js";
import "@gemologic/sheen-patterns/styles.css";

export default function SettingsLayoutFixture() {
  const router = useSolidRouterAdapter();
  const [draft, setDraft] = createSignal("Ada Lovelace");
  const [saved, setSaved] = createSignal("Ada Lovelace");
  const [active, setActive] = createSignal("profile");
  const [reject, setReject] = createSignal(false);
  const [saveCount, setSaveCount] = createSignal(0);
  const sections: readonly SettingsLayoutSection[] = [
    {
      id: "profile", label: "Profile", description: "Public account details and identity.",
      content: <div class="loupe-settings-section-fixture"><Input label="Display name" value={draft()} onInput={event => setDraft(event.currentTarget.value)} /><A href="/browser-status">Leave settings</A></div>,
    },
    {
      id: "appearance", label: "Appearance", description: "Personal presentation preferences.",
      content: <div class="loupe-settings-section-fixture"><Checkbox label="Reject next save" checked={reject()} onCheckedChange={setReject} /><p>Theme selection remains owned by the application provider.</p></div>,
    },
  ];
  const save = async () => {
    const submitted = draft();
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
    if (!response.ok) throw new Error(`Settings save failed (${response.status})`);
    setSaved(submitted);
    setSaveCount(value => value + 1);
  };
  return <AppShell router={router} label="Settings workspace" header={<PageHeader title="Settings" />}
    statusBar={<StatusBar><output aria-label="Accepted display name">{saved()}</output><output aria-label="Save count">{saveCount()}</output></StatusBar>}>
    <SettingsLayout label="Account settings" sections={sections} activeSection={active()} onSectionChange={setActive}
      dirty={draft() !== saved()} onSave={save} onDiscard={() => setDraft(saved())} />
  </AppShell>;
}
