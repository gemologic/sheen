import { describe, expect, it } from "vitest";
import { defineTheme } from "../packages/tokens/src/index.ts";
import {
  auditEditorTheme,
  createDefaultEditorTheme,
  deriveEditorTheme,
  exportThemeModule,
  formatOklchChannels,
  importThemeSource,
  readOklchChannels,
  updateEditorToken,
} from "../apps/loupe/src/theme-editor-state.ts";

describe("Loupe theme editor state", () => {
  it("starts from a complete dark-default theme and accepts structurally valid contrast failures", () => {
    const initial = createDefaultEditorTheme();
    expect(initial.defaultMode).toBe("dark");
    expect(auditEditorTheme(initial).diagnostics).toEqual([]);
    const failing = updateEditorToken(initial, "dark", "color-fg-muted", "#222222");
    expect(auditEditorTheme(failing).diagnostics.some(message => message.includes("color-fg-muted"))).toBe(true);
    expect(() => defineTheme(failing)).toThrow(/color-fg-muted/u);
  });

  it("derives exportable dark and light neutral systems", () => {
    const dark = deriveEditorTheme(createDefaultEditorTheme(), { mode: "dark", background: "#101820", accent: "cyan", neutralHue: 230 });
    expect(() => defineTheme(dark)).not.toThrow();
    const light = deriveEditorTheme(dark, { mode: "light", background: "#fbf8f2", accent: "indigo", neutralHue: 75 });
    expect(() => defineTheme(light)).not.toThrow();
    expect(light.defaultMode).toBe("light");
  });

  it("round-trips only JSON or Loupe's generated TypeScript envelope", () => {
    const initial = createDefaultEditorTheme();
    const source = exportThemeModule(initial);
    expect(importThemeSource(source)).toEqual(defineTheme(initial));
    expect(importThemeSource(JSON.stringify(initial))).toEqual(defineTheme(initial));
    expect(() => importThemeSource('console.log("nope");')).toThrow(/never executed/u);
    expect(() => importThemeSource('{"id":"partial"}')).toThrow(/schemaVersion/u);
  });

  it("converts editable color values through bounded OKLCH channels", () => {
    const channels = readOklchChannels("#6ee7b7");
    expect(channels.lightness).toBeGreaterThan(80);
    expect(formatOklchChannels({ ...channels, hue: 725, alpha: 2 })).toMatch(/^oklch\(.+ 5\.00\)$/u);
  });
});
