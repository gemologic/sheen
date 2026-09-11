import { parseColor, toHex } from "./color.ts";
import type { PrimitiveMap } from "./schema.ts";

/** Thirteen equally spaced lightness stops; chroma tapers at both endpoints. */
export function colorRamp(hue: number, chroma: number): Readonly<Record<string, string>> {
  if (!Number.isFinite(hue) || !Number.isFinite(chroma) || chroma < 0) throw new Error("Color ramps need a finite hue and nonnegative chroma");
  const stops = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000];
  return Object.freeze(Object.fromEntries(stops.map((stop, index) => {
    const fraction = index / (stops.length - 1);
    return [String(stop), toHex(parseColor(`oklch(${0.99 - 0.87 * fraction} ${chroma * Math.sin(Math.PI * fraction)} ${hue})`))];
  })));
}

function createPrimitives(): PrimitiveMap {
  const values: Record<string, string> = {};
  for (const [name, hue, chroma] of [
    ["gray", 265, 0.006], ["jade", 175, 0.11], ["amber", 85, 0.15], ["cyan", 215, 0.11], ["rose", 15, 0.15], ["violet", 300, 0.15],
  ] satisfies [string, number, number][]) {
    for (const [stop, value] of Object.entries(colorRamp(hue, chroma))) values[`${name}.${stop}`] = value;
  }
  // These neutral anchors define the audited initial surfaces and text roles.
  Object.assign(values, {
    "gray.0": "#ffffff", "gray.30": "#f4f4f6", "gray.100": "#e4e4e7", "gray.200": "#d4d4d8",
    "gray.300": "#bfc0c8", "gray.400": "#a1a1aa", "gray.500": "#71717a", "gray.600": "#52525b",
    "gray.700": "#3f3f46", "gray.800": "#323239", "gray.850": "#292930", "gray.900": "#232329",
    "gray.940": "#1e1e24", "gray.960": "#18181e", "gray.980": "#141419", "gray.1000": "#101014",
  });
  for (let index = 0; index <= 96; index++) values[`size.${index}`] = `${index * 4}px`;
  for (const [index, pixels] of [0, 2, 4, 5, 8, 12, 16].entries()) values[`radius.${index}`] = `${pixels}px`;
  values["radius.full"] = "999px";
  for (const [index, pixels] of [11, 12, 13, 14, 16, 18, 20, 24, 28, 32].entries()) values[`font-size.${index + 1}`] = `${pixels}px`;
  for (let index = 1; index <= 5; index++) values[`shadow.${index}`] = `0 ${index * 2}px ${index * 8}px #00000044`;
  Object.assign(values, {
    "duration.fast": "100ms", "duration.normal": "150ms", "duration.slow": "250ms",
    "ease.standard": "cubic-bezier(0.2, 0, 0, 1)", "ease.entrance": "cubic-bezier(0, 0, 0, 1)", "ease.exit": "cubic-bezier(0.3, 0, 1, 1)",
    "z.base": "0", "z.chrome": "10", "z.overlay": "100", "z.modal": "200", "z.toast": "300",
  });
  return Object.freeze(values);
}

export const primitives = createPrimitives();
