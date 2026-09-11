import { describe, expect, it } from "vitest";
import { defaultComparisonState, defaultLabState, parseComparisonState, parseLabState, readLabStateMessage, serializeComparisonState, serializeLabState } from "../apps/loupe/src/lab-state.ts";
import type { LabState } from "../apps/loupe/src/lab-state.ts";

describe("Loupe laboratory URL state", () => {
  it("round-trips every theme and viewport axis", () => {
    const state: LabState = { ...defaultLabState, theme: "vellum", mode: "light", accent: "rose", density: "spacious", radius: "round", motion: "reduced", direction: "rtl", locale: "ar-EG", width: 740, height: 560 };
    expect(parseLabState(serializeLabState(state))).toEqual(state);
  });

  it("falls back per invalid field without discarding accepted axes", () => {
    expect(parseLabState("?theme=paper&mode=bright&accent=jade&locale=not_a_locale&width=40&height=480")).toEqual({
      ...defaultLabState,
      theme: "paper",
      height: 480,
    });
  });

  it("validates cross-window messages before parsing them", () => {
    expect(readLabStateMessage({ kind: "sheen-lab-state", search: "?theme=slate&accent=cyan" })).toMatchObject({ theme: "slate", accent: "cyan" });
    expect(readLabStateMessage({ kind: "wrong", search: "?theme=paper" })).toBeUndefined();
    expect(readLabStateMessage("?theme=paper")).toBeUndefined();
  });

  it("round-trips independently prefixed comparison panes", () => {
    const state = {
      first: { ...defaultComparisonState.first, theme: "slate", accent: "cyan", width: 768 },
      second: { ...defaultComparisonState.second, theme: "vellum", accent: "amber", density: "comfortable", width: 1440 },
    } satisfies typeof defaultComparisonState;
    expect(parseComparisonState(serializeComparisonState(state))).toEqual(state);
    expect(parseComparisonState("?first.width=bad&second.mode=nope")).toEqual(defaultComparisonState);
  });
});
