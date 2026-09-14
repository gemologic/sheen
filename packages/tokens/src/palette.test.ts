import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { obsidian, themes } from "./themes.ts";
import { auditChartPalette, cam16UcsDistance, chartPaletteThresholds, simulateColorVision, validateChartPalette, xyzToCam16Ucs } from "./palette.ts";
import type { ColorVisionSimulation } from "./palette.ts";
import type { Mode, Tokens } from "./schema.ts";

interface ReferenceFixture {
  readonly thresholds: { readonly normalAdjacent: number; readonly simulatedAdjacent: number };
  readonly cam16Ucs: {
    readonly xyz: readonly [number, number, number];
    readonly white: readonly [number, number, number];
    readonly adaptingLuminance: number;
    readonly backgroundLuminance: number;
    readonly expected: readonly [number, number, number];
  };
  readonly redSimulation: Readonly<Record<ColorVisionSimulation, string>> & { readonly input: string };
  readonly bundledMinimumAdjacent: Readonly<Record<Mode, Readonly<Record<Exclude<ColorVisionSimulation, "achromatopsia"> | "normal", number>>>>;
}

function isTriple(value: unknown): value is readonly [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(item => typeof item === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function numberValue(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number") throw new Error(`Palette fixture ${key} is invalid`);
  return value;
}

function stringValue(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`Palette fixture ${key} is invalid`);
  return value;
}

function distanceValues(value: unknown, label: string): Readonly<Record<"normal" | Exclude<ColorVisionSimulation, "achromatopsia">, number>> {
  if (!isRecord(value)) throw new Error(`Palette fixture ${label} values are missing`);
  return {
    normal: numberValue(value, "normal"),
    protanopia: numberValue(value, "protanopia"),
    deuteranopia: numberValue(value, "deuteranopia"),
    tritanopia: numberValue(value, "tritanopia"),
  };
}

function parseFixture(value: unknown): ReferenceFixture {
  if (!isRecord(value)) throw new Error("Palette fixture must be an object");
  const object = value;
  const thresholds = object.thresholds, cam16Ucs = object.cam16Ucs, redSimulation = object.redSimulation, bundled = object.bundledMinimumAdjacent;
  if (!isRecord(thresholds) || !isRecord(cam16Ucs) || !isRecord(redSimulation) || !isRecord(bundled)) throw new Error("Palette fixture sections are missing");
  const xyz = cam16Ucs.xyz, white = cam16Ucs.white, expected = cam16Ucs.expected;
  if (!isTriple(xyz) || !isTriple(white) || !isTriple(expected)) throw new Error("Palette fixture triples are invalid");
  return {
    thresholds: { normalAdjacent: numberValue(thresholds, "normalAdjacent"), simulatedAdjacent: numberValue(thresholds, "simulatedAdjacent") },
    cam16Ucs: { xyz, white, adaptingLuminance: numberValue(cam16Ucs, "adaptingLuminance"), backgroundLuminance: numberValue(cam16Ucs, "backgroundLuminance"), expected },
    redSimulation: { input: stringValue(redSimulation, "input"), protanopia: stringValue(redSimulation, "protanopia"), deuteranopia: stringValue(redSimulation, "deuteranopia"), tritanopia: stringValue(redSimulation, "tritanopia"), achromatopsia: stringValue(redSimulation, "achromatopsia") },
    bundledMinimumAdjacent: {
      dark: distanceValues(bundled.dark, "dark"),
      light: distanceValues(bundled.light, "light"),
    },
  };
}

const fixtureUrl = new URL("../test-fixtures/palette-reference.json", import.meta.url);

describe("chart palette qualification", () => {
  it("matches the committed CAM16-UCS and severity-one simulation references", async () => {
    const fixture = parseFixture(JSON.parse(await readFile(fixtureUrl, "utf8")));
    const result = xyzToCam16Ucs(fixture.cam16Ucs.xyz, fixture.cam16Ucs.white, fixture.cam16Ucs.adaptingLuminance, fixture.cam16Ucs.backgroundLuminance);
    expect([result.j, result.a, result.b]).toEqual(fixture.cam16Ucs.expected.map(value => expect.closeTo(value, 10)));
    for (const simulation of ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"] satisfies ColorVisionSimulation[]) {
      expect(simulateColorVision(fixture.redSimulation.input, simulation), simulation).toBe(fixture.redSimulation[simulation]);
    }
  });

  it("pins policy thresholds and bundled palette results", async () => {
    const fixture = parseFixture(JSON.parse(await readFile(fixtureUrl, "utf8")));
    expect(chartPaletteThresholds).toEqual(fixture.thresholds);
    for (const mode of ["dark", "light"] satisfies Mode[]) {
      const audit = auditChartPalette(obsidian[mode]);
      for (const simulation of ["normal", "protanopia", "deuteranopia", "tritanopia"] satisfies ("normal" | Exclude<ColorVisionSimulation, "achromatopsia">)[]) {
        expect(audit[simulation].minimumAdjacent.distance, `${mode}/${simulation}`).toBeCloseTo(fixture.bundledMinimumAdjacent[mode][simulation], 10);
      }
    }
  });

  it("qualifies every bundled theme and reports every failed simulation", () => {
    for (const theme of themes) for (const mode of ["dark", "light"] satisfies Mode[]) expect(validateChartPalette(theme[mode]), `${theme.id}/${mode}`).toEqual([]);
    const collapsed: Tokens = { ...obsidian.dark, "chart-2": obsidian.dark["chart-1"] };
    const diagnostics = validateChartPalette(collapsed);
    expect(diagnostics).toHaveLength(4);
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining("under normal"),
      expect.stringContaining("under protanopia"),
      expect.stringContaining("under deuteranopia"),
      expect.stringContaining("under tritanopia"),
    ]));
  });

  it("audits achromatopsia without pretending color alone can qualify it", () => {
    const audit = auditChartPalette(obsidian.dark);
    expect(audit.achromatopsia.minimumAdjacent.distance).toBeGreaterThan(0);
    expect(validateChartPalette(obsidian.dark).some(message => message.includes("achromatopsia"))).toBe(false);
  });

  it("preserves pair distances and tie ordering when reusing each color conversion", () => {
    for (const theme of themes) for (const mode of ["dark", "light"] satisfies Mode[]) {
      const tokens = theme[mode];
      const colors = [tokens["chart-1"], tokens["chart-2"], tokens["chart-3"], tokens["chart-4"], tokens["chart-5"], tokens["chart-6"], tokens["chart-7"], tokens["chart-8"]];
      const audit = auditChartPalette(tokens);
      for (const simulation of ["normal", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"] satisfies ("normal" | ColorVisionSimulation)[]) {
        const values = simulation === "normal" ? colors : colors.map(color => simulateColorVision(color, simulation));
        const pairs = values.flatMap((first, index) => values.slice(index + 1).map((second, offset) => ({
          first: index + 1, second: index + offset + 2, distance: cam16UcsDistance(first, second),
        })));
        const ordered = [...pairs].sort((left, right) => left.distance - right.distance);
        const adjacent = pairs.filter(pair => pair.second === pair.first + 1).sort((left, right) => left.distance - right.distance);
        expect(audit[simulation], `${theme.id}/${mode}/${simulation}`).toEqual({ minimumPair: ordered[0], minimumAdjacent: adjacent[0] });
      }
    }
  });
});
