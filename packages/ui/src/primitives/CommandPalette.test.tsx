import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { ShortcutProvider } from "./ShortcutProvider.tsx";
import { CommandPalette, commandPaletteFilter } from "./CommandPalette.tsx";

describe("CommandPalette", () => {
  it("ranks exact, prefix, substring, keyword, and subsequence matches deterministically", () => {
    expect(commandPaletteFilter("settings", "settings")).toBe(1);
    expect(commandPaletteFilter("settings", "set")).toBe(0.9);
    expect(commandPaletteFilter("open settings", "settings")).toBe(0.7);
    expect(commandPaletteFilter("preferences", "con", ["config"])).toBe(0.9);
    expect(commandPaletteFilter("settings", "stg")).toBeGreaterThan(0);
    expect(commandPaletteFilter("settings", "xyz")).toBe(0);
  });

  it("renders deterministic closed server markup without a browser portal", () => {
    const html = renderToString(() => <ThemeProvider><ShortcutProvider development={true}><CommandPalette sources={[{ kind: "static", id: "app", commands: [{ id: "settings", label: "Settings", group: "Navigation", run: () => {} }] }]} /></ShortcutProvider></ThemeProvider>);
    expect(html).toContain("data-sheen-portal=\"root\"");
    expect(html).not.toContain("sheen-command-dialog");
  });
});
