import { describe, expect, it } from "vitest";
import { defaultThemeState, readThemeState, resolveThemeState } from "./state.ts";
import { createThemeScript, createScopeScript } from "./script.ts";

describe("theme state", () => {
  it("starts dark regardless of OS preference and independently selects an accent", () => {
    expect(defaultThemeState.mode).toBe("dark");
    expect(readThemeState({ theme: "paper", accent: "amber" }, defaultThemeState)).toMatchObject({ theme: "paper", accent: "amber", mode: "dark" });
  });
  it("inherits omitted axes and resets null to configured defaults", () => {
    const parent = { ...defaultThemeState, theme: "slate", accent: "indigo", density: "compact" } satisfies typeof defaultThemeState;
    const resolved = resolveThemeState(parent, { theme: "paper", accent: null }, defaultThemeState);
    expect(resolved).toMatchObject({ theme: "paper", accent: "jade", density: "compact" });
    expect(parent.accent).toBe("indigo");
  });
  it("validates persisted axes independently and rejects malformed locale", () => {
    expect(readThemeState({ theme: "deleted", mode: "system", accent: "invented", density: "huge", locale: "not_a_locale" }, defaultThemeState)).toEqual({ ...defaultThemeState, mode: "system" });
    expect(readThemeState(null, defaultThemeState)).toEqual(defaultThemeState);
    expect(readThemeState({ theme: "private" }, defaultThemeState, ["private"])).toMatchObject({ theme: "private" });
  });
  it("encodes inline scripts without allowing script termination", () => {
    expect(createThemeScript({ storageKey: "</script><script>alert(1)</script>" })).not.toContain("</script>");
    expect(createScopeScript({ theme: "</script>" }, defaultThemeState)).not.toContain("</script>");
  });
});
