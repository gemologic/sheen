import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Input, ThemeProvider } from "@gemologic/sheen";
import { AppShell } from "./AppShell.tsx";
import { SettingsLayout } from "./SettingsLayout.tsx";

function sections() {
  return [
    { id: "profile", label: "Profile", description: "Public account details", content: <Input label="Display name" /> },
    { id: "appearance", label: "Appearance", content: <p>Theme controls</p> },
  ];
}

function render(overrides: Partial<Parameters<typeof SettingsLayout>[0]> = {}): string {
  return renderToString(() => <ThemeProvider><AppShell label="Settings"><SettingsLayout label="Workspace settings" sections={sections()} dirty={false} onSave={() => {}} {...overrides} /></AppShell></ThemeProvider>);
}

describe("SettingsLayout", () => {
  it("renders deterministic section navigation and a persistent clean save bar", () => {
    const html = render();
    expect(html).toContain('aria-label="Workspace settings"');
    expect(html).toContain('aria-label="Settings sections"');
    expect(html).toContain('aria-current="location"');
    expect(html).toContain("Public account details");
    expect(html).toContain("Theme controls");
    expect(html).toContain("Save changes");
    expect(html).toContain('data-dirty="false"');
  });

  it("registers dirty presentation without removing section content", () => {
    const html = render({ dirty: true, activeSection: "appearance", saveError: "Could not save settings" });
    expect(html).toContain('data-dirty="true"');
    expect(html).toContain("Could not save settings");
    expect(html).toMatch(/aria-controls="([^"]+-appearance)"/u);
    expect(html).toContain('data-section-id="profile"');
  });

  it("fails closed on invalid section and state contracts", () => {
    expect(() => render({ sections: [] })).toThrow("at least one section");
    expect(() => render({ sections: [{ id: "same", label: "One", content: null }, { id: "same", label: "Two", content: null }] })).toThrow("unique");
    expect(() => render({ activeSection: "missing" })).toThrow("current section");
  });
});
