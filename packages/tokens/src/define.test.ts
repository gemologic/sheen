import { describe, expect, it } from "vitest";
import { buildTheme, defineTheme, resolveTokens, ThemeValidationError, validateContrast } from "./define.ts";
import { accentNames, accents, accentTokens, buildAccent, buildAccents, contrast, isAccentName, obsidian, studio, themes, vellum } from "./themes.ts";
import { primitives } from "./primitives.ts";
import { currentSchemaVersion, semanticDefaults } from "./schema.ts";
import type { Mode, ThemeDefinition, TokenName } from "./schema.ts";
import { buildCore, buildPreset } from "./css.ts";
import { bundledThemeMetadata } from "./catalog.ts";

function definition(overrides: Partial<ThemeDefinition> = {}): ThemeDefinition {
  return { schemaVersion: currentSchemaVersion, id: "test", label: "Test", description: "Unit test theme", defaultMode: "dark", iconSet: "radix", primitives, dark: { ...semanticDefaults }, light: { ...obsidian.light }, ...overrides };
}

describe("theme compiler", () => {
  it("resolves semantic references through primitive references", () => {
    const result = resolveTokens(definition({ primitives: { ...primitives, "custom.base": "{gray.980}" }, dark: { ...semanticDefaults, "color-bg": "{custom.base}", "color-bg-inset": "{color-bg}" } }), "dark");
    expect(result["color-bg"]).toBe("#141419");
    expect(result["color-bg-inset"]).toBe("#141419");
  });
  it("reports cycles with their paths", () => {
    expect(() => resolveTokens(definition({ dark: { ...semanticDefaults, "color-bg": "{color-bg-inset}", "color-bg-inset": "{color-bg}" } }), "dark")).toThrow("color-bg -> color-bg-inset -> color-bg");
  });
  it("reports every missing key instead of silently inheriting current defaults", () => {
    try { resolveTokens(definition({ dark: {} }), "dark"); throw new Error("Expected validation failure"); }
    catch (error) {
      expect(error).toBeInstanceOf(ThemeValidationError);
      if (!(error instanceof ThemeValidationError)) throw error;
      expect(error.diagnostics).toHaveLength(Object.keys(semanticDefaults).length);
    }
  });
  it("applies only explicit defaults introduced after an older schema", () => {
    const dark = { ...semanticDefaults };
    const legacy: Partial<typeof dark> = { ...dark };
    delete legacy["color-border-control"];
    delete legacy["color-focus-ring-offset"];
    expect(resolveTokens(definition({ schemaVersion: 1, dark: legacy }), "dark")["color-focus-ring-offset"]).toBe("#141419");
    expect(() => resolveTokens(definition({ schemaVersion: 2, dark: legacy }), "dark")).toThrow("missing token color-border-control");
    delete legacy["font-sans"];
    expect(() => resolveTokens(definition({ schemaVersion: 1, dark: legacy }), "dark")).toThrow("missing token font-sans");
  });
  it("rejects unknown versions, IDs, tokens, unresolved references, and CSS injection", () => {
    expect(() => defineTheme(definition({ schemaVersion: 99 }))).toThrow("Unsupported schema version");
    expect(() => defineTheme(definition({ id: 'bad"]{}' }))).toThrow("Invalid theme id");
    const extraToken = { ...semanticDefaults, extra: "red" };
    expect(() => resolveTokens(definition({ dark: extraToken }), "dark")).toThrow("unknown token extra");
    expect(() => resolveTokens(definition({ dark: { ...semanticDefaults, "color-bg": "{missing}" } }), "dark")).toThrow("unresolved reference missing");
    expect(() => resolveTokens(definition({ dark: { ...semanticDefaults, "font-sans": "sans; color:red" } }), "dark")).toThrow("unsafe CSS value");
  });
  it("validates colors even when their role has no contrast gate", () => {
    try {
      defineTheme(definition({ dark: { ...semanticDefaults, "chart-8": "invalid-chart", "color-fg-subtle": "invalid-disabled" } }));
      throw new Error("Expected invalid colors");
    } catch (error) {
      if (!(error instanceof ThemeValidationError)) throw error;
      expect(error.diagnostics).toEqual(expect.arrayContaining([
        expect.stringContaining("chart-8: Unsupported concrete color: invalid-chart"),
        expect.stringContaining("color-fg-subtle: Unsupported concrete color: invalid-disabled"),
      ]));
    }
  });
  it("migrates v2 tone additions through the private theme's own roles", () => {
    const legacy: Partial<typeof semanticDefaults> = { ...semanticDefaults };
    delete legacy["color-neutral-on"];
    delete legacy["color-danger-on"];
    delete legacy["color-market-up-border"];
    const migrated = resolveTokens(definition({ schemaVersion: 2, dark: legacy }), "dark");
    expect(migrated["color-neutral-on"]).toBe(migrated["color-bg"]);
    expect(migrated["color-danger-on"]).toBe(migrated["color-fg-on-accent"]);
    expect(migrated["color-market-up-border"]).toBe(migrated["color-market-up"]);
    expect(() => resolveTokens(definition({ schemaVersion: currentSchemaVersion, dark: legacy }), "dark")).toThrow("missing token color-neutral-on");
  });
  it("emits scoped fallback CSS before modern color overrides", () => {
    const css = buildTheme(definition());
    expect(css).toContain('[data-sheen-theme="test"][data-sheen-mode="dark"]');
    expect(css).not.toContain(":root");
    expect(css).not.toContain("{gray.");
    expect(css.indexOf("#141419")).toBeLessThan(css.indexOf("@supports"));
    expect(css).toContain("oklch(");
  });
  it("reports multiple contrast failures and permits subtle structural borders", () => {
    const failures = validateContrast({ ...obsidian.dark, "color-fg": "#141419", "color-fg-muted": "#141419" });
    expect(failures.length).toBeGreaterThanOrEqual(8);
    expect(validateContrast({ ...obsidian.dark, "color-border": "#141419", "color-fg-subtle": "#141419" })).toEqual([]);
  });
  it("collects reference failures from both modes", () => {
    try {
      defineTheme(definition({ dark: { ...semanticDefaults, "color-bg": "{dark-missing}" }, light: { ...obsidian.light, "color-bg": "{light-missing}" } }));
      throw new Error("Expected invalid theme");
    } catch (error) {
      if (!(error instanceof ThemeValidationError)) throw error;
      expect(error.diagnostics.some(item => item.includes("dark-missing"))).toBe(true);
      expect(error.diagnostics.some(item => item.includes("light-missing"))).toBe(true);
    }
  });
  it("validates state text, status fills, and composited declared surfaces", () => {
    const failures = validateContrast({ ...obsidian.dark, "color-bg-selected": obsidian.dark["color-fg"], "color-danger-on": obsidian.dark["color-danger"] });
    expect(failures.some(item => item.includes("color-fg on color-bg-selected"))).toBe(true);
    expect(failures.some(item => item.includes("color-danger-on on color-danger"))).toBe(true);
    expect(validateContrast({ ...obsidian.dark, "color-bg-overlay": "#ffffff80" }, 4.5, [
      { foreground: "color-fg", background: "color-bg-overlay", surface: "color-bg", minimum: 4.5 },
    ]).some(item => item.includes("color-fg on color-bg-overlay"))).toBe(true);
  });
  it("keeps market/status roles independent of accent and distinguishes interaction colors", () => {
    for (const name of Object.keys(accents)) {
      if (!isAccentName(name)) throw new Error("Unknown accent");
      const variant = { ...obsidian.dark, ...accentTokens(name, "dark") };
      expect(variant["color-danger"]).toBe(obsidian.dark["color-danger"]);
      expect(variant["color-market-up"]).toBe(obsidian.dark["color-market-up"]);
      expect(variant["color-accent-hover"]).not.toBe(variant["color-accent"]);
      expect(variant["color-accent-active"]).not.toBe(variant["color-accent-hover"]);
    }
  });
  it("validates all seven themes in both modes with all twelve accent choices", () => {
    expect(themes).toHaveLength(7);
    expect(Object.keys(accents)).toHaveLength(12);
    expect(accentNames).toHaveLength(12);
    for (const theme of themes) for (const mode of ["dark", "light"] satisfies Mode[]) for (const name of Object.keys(accents)) {
      if (!isAccentName(name)) throw new Error("Unknown fixture accent");
      expect(validateContrast({ ...theme[mode], ...accentTokens(name, mode, theme.id) }, theme.id === "contrast" ? 7 : 4.5), `${theme.id}/${mode}/${name}`).toEqual([]);
    }
    expect(buildAccents()).toContain('[data-sheen-mode="dark"][data-sheen-accent="amber"]');
    expect(buildAccent("jade")).toContain('[data-sheen-mode="light"][data-sheen-accent="jade"]');
    expect(buildAccent("jade")).not.toContain('data-sheen-accent="amber"');
  });
  it("ships seven complete and visually distinct surface systems with dark defaults", () => {
    const paletteKeys = [
      "color-bg", "color-bg-subtle", "color-bg-raised", "color-bg-inset", "color-bg-hover", "color-bg-active", "color-bg-selected",
      "color-fg", "color-fg-muted", "color-border", "color-border-control", "color-focus-ring",
    ] satisfies readonly TokenName[];
    for (const mode of ["dark", "light"] satisfies Mode[]) {
      const signatures = themes.map(theme => paletteKeys.map(key => theme[mode][key]).join("|"));
      expect(new Set(signatures).size, `${mode} palette signatures`).toBe(themes.length);
    }
    expect(themes.every(theme => theme.defaultMode === "dark")).toBe(true);
    expect(studio.iconSet).toBe("phosphor");
    expect(Number.parseFloat(studio.dark["text-body-size"])).toBeGreaterThan(Number.parseFloat(obsidian.dark["text-body-size"]));
    expect(bundledThemeMetadata).toEqual(themes.map(({ id, label, description, defaultMode, iconSet }) => ({ id, label, description, defaultMode, iconSet })));
  });
  it("emits the documented comfortable type scale and tier-three fallbacks", () => {
    expect(semanticDefaults).toMatchObject({
      "text-caption-size": "11px", "text-caption-leading": "16px",
      "text-ui-sm-size": "12px", "text-ui-sm-leading": "16px",
      "text-ui-size": "13px", "text-ui-leading": "20px",
      "text-body-size": "14px", "text-body-leading": "22px",
      "text-h1-size": "24px", "text-h1-leading": "32px",
      "text-h2-size": "20px", "text-h2-leading": "28px",
      "text-h3-size": "16px", "text-h3-leading": "24px",
      "text-h4-size": "14px", "text-h4-leading": "20px",
    });
    const core = buildCore();
    for (const declaration of [
      "--sheen-button-radius: var(--sheen-control-radius)",
      "--sheen-table-row-h: 34px",
      "--sheen-sidebar-w: 220px",
      "--sheen-sidebar-w-collapsed: 48px",
      "--sheen-topbar-h: 44px",
      "--sheen-statusbar-h: 26px",
    ]) expect(core).toContain(declaration);
  });
  it("gives reading themes larger prose and contrast themes untinted soft surfaces", () => {
    for (const mode of ["dark", "light"] satisfies Mode[]) {
      expect(Number.parseFloat(vellum[mode]["text-body-size"])).toBeGreaterThan(Number.parseFloat(obsidian[mode]["text-body-size"]));
      expect(Number.parseFloat(vellum[mode]["text-body-leading"])).toBeGreaterThan(Number.parseFloat(obsidian[mode]["text-body-leading"]));
      for (const [key, value] of Object.entries(contrast[mode])) {
        if (key.startsWith("color-") && key.endsWith("-subtle") && key !== "color-fg-subtle" && key !== "color-border-subtle") {
          expect(value, `${mode}/${key}`).toBe(mode === "dark" ? "#000000" : "#ffffff");
        }
      }
    }
  });
  it("emits the CSS-only bridge and resettable modifier axes", () => {
    expect(buildPreset()).toContain("@theme inline");
    expect(buildPreset()).toContain("--color-border-control: var(--sheen-color-border-control)");
    expect(buildCore()).toContain('[data-sheen-density="comfortable"]');
    expect(buildCore()).toContain("prefers-reduced-motion");
    expect(buildCore()).toContain("@media (forced-colors: active)");
    expect(buildCore()).toContain("--sheen-color-bg: Canvas !important");
    expect(buildCore()).toContain("--sheen-color-fg: CanvasText !important");
    expect(buildCore()).toContain("--sheen-color-focus-ring: Highlight !important");
  });
});
