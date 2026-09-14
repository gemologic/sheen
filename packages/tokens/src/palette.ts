import { clampChannel, fromLinearChannel, parseColor, toHex, toLinearChannel } from "./color.ts";
import type { Color } from "./color.ts";
import type { TokenName, Tokens } from "./schema.ts";

type Vector3 = readonly [number, number, number];
type Matrix3 = readonly [Vector3, Vector3, Vector3];

export type ColorVisionSimulation = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";
type ChromaticVisionSimulation = Exclude<ColorVisionSimulation, "achromatopsia">;

export interface Cam16Ucs {
  readonly j: number;
  readonly a: number;
  readonly b: number;
}

export interface PalettePairDistance {
  readonly first: number;
  readonly second: number;
  readonly distance: number;
}

export interface PaletteDistanceAudit {
  readonly minimumAdjacent: PalettePairDistance;
  readonly minimumPair: PalettePairDistance;
}

export interface ChartPaletteAudit {
  readonly normal: PaletteDistanceAudit;
  readonly protanopia: PaletteDistanceAudit;
  readonly deuteranopia: PaletteDistanceAudit;
  readonly tritanopia: PaletteDistanceAudit;
  readonly achromatopsia: PaletteDistanceAudit;
}

export const chartPaletteThresholds = Object.freeze({
  normalAdjacent: 18,
  simulatedAdjacent: 7,
});

const cat16: Matrix3 = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127],
];

const d65: Vector3 = [95.047, 100, 108.883];
const adaptingLuminance = 64 / Math.PI * 0.2;
const backgroundLuminance = 20;

// Machado, Oliveira, and Fernandes (2009), severity 1.0 matrices. These
// operate on linear-light RGB. Achromatopsia is handled separately because
// it is outside that model.
const cvdMatrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} satisfies Record<ChromaticVisionSimulation, Matrix3>;

const chartTokenNames = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8"] satisfies readonly TokenName[];

function multiply(matrix: Matrix3, vector: Vector3): Vector3 {
  const [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]] = matrix;
  const [x, y, z] = vector;
  return [
    m00 * x + m01 * y + m02 * z,
    m10 * x + m11 * y + m12 * z,
    m20 * x + m21 * y + m22 * z,
  ];
}

function compress(channel: number, fl: number): number {
  const magnitude = (fl * Math.abs(channel) / 100) ** 0.42;
  return 400 * Math.sign(channel) * magnitude / (27.13 + magnitude) + 0.1;
}

export function xyzToCam16Ucs(xyz: Vector3, white: Vector3 = d65, la = adaptingLuminance, yb = backgroundLuminance): Cam16Ucs {
  const [, yw] = white;
  const rgbWhite = multiply(cat16, white);
  const [rw, gw, bw] = rgbWhite;
  const degree = clampChannel(1 - Math.exp((-la - 42) / 92) / 3.6);
  const adaptation: Vector3 = [degree * yw / rw + 1 - degree, degree * yw / gw + 1 - degree, degree * yw / bw + 1 - degree];
  const n = yb / yw;
  const k = 1 / (5 * la + 1);
  const k4 = k ** 4;
  const fl = k4 * la + 0.1 * (1 - k4) ** 2 * Math.cbrt(5 * la);
  const nbb = 0.725 * n ** -0.2;
  const z = 1.48 + Math.sqrt(n);
  const [rwc, gwc, bwc] = multiplyDiagonal(adaptation, rgbWhite);
  const raw = multiply(cat16, xyz);
  const [rc, gc, bc] = multiplyDiagonal(adaptation, raw);
  const [rawResponseR, rawResponseG, rawResponseB] = [compress(rwc, fl), compress(gwc, fl), compress(bwc, fl)];
  const [responseR, responseG, responseB] = [compress(rc, fl), compress(gc, fl), compress(bc, fl)];
  const aw = (2 * rawResponseR + rawResponseG + rawResponseB / 20 - 0.305) * nbb;
  const achromatic = (2 * responseR + responseG + responseB / 20 - 0.305) * nbb;
  const lightness = 100 * (achromatic / aw) ** (0.69 * z);
  const opponentA = responseR - 12 * responseG / 11 + responseB / 11;
  const opponentB = (responseR + responseG - 2 * responseB) / 9;
  const hueRadians = Math.atan2(opponentB, opponentA);
  const hueDegrees = (hueRadians * 180 / Math.PI + 360) % 360;
  const eccentricity = (Math.cos(2 + hueRadians) + 3.8) / 4;
  const t = 50_000 / 13 * nbb * eccentricity * Math.hypot(opponentA, opponentB) / (responseR + responseG + 21 * responseB / 20);
  const chroma = t ** 0.9 * Math.sqrt(lightness / 100) * (1.64 - 0.29 ** n) ** 0.73;
  const colourfulness = chroma * fl ** 0.25;
  return jmhToCam16Ucs(lightness, colourfulness, hueDegrees);
}

function multiplyDiagonal(diagonal: Vector3, vector: Vector3): Vector3 {
  const [a, b, c] = diagonal;
  const [x, y, z] = vector;
  return [a * x, b * y, c * z];
}

export function jmhToCam16Ucs(lightness: number, colourfulness: number, hueDegrees: number): Cam16Ucs {
  const j = 1.7 * lightness / (1 + 0.007 * lightness);
  const magnitude = Math.log1p(0.0228 * colourfulness) / 0.0228;
  const hue = hueDegrees * Math.PI / 180;
  return { j, a: magnitude * Math.cos(hue), b: magnitude * Math.sin(hue) };
}

export function colorToCam16Ucs(value: string): Cam16Ucs {
  const color = parseColor(value);
  if (color.a !== 1) throw new Error(`CAM16-UCS requires an opaque color: ${value}`);
  const r = toLinearChannel(color.r), g = toLinearChannel(color.g), b = toLinearChannel(color.b);
  return xyzToCam16Ucs([
    (0.4123907992659595 * r + 0.357584339383878 * g + 0.1804807884018343 * b) * 100,
    (0.2126390058715104 * r + 0.715168678767756 * g + 0.0721923153607337 * b) * 100,
    (0.0193308187155918 * r + 0.119194779794626 * g + 0.950532152249661 * b) * 100,
  ]);
}

export function cam16UcsDistance(first: string, second: string): number {
  const a = colorToCam16Ucs(first), b = colorToCam16Ucs(second);
  return Math.hypot(a.j - b.j, a.a - b.a, a.b - b.b);
}

export function simulateColorVision(value: string, simulation: ColorVisionSimulation): string {
  const color = parseColor(value);
  const linear: Vector3 = [toLinearChannel(color.r), toLinearChannel(color.g), toLinearChannel(color.b)];
  const transformed = simulation === "achromatopsia"
    ? achromatic(linear)
    : multiply(cvdMatrices[simulation], linear);
  const [r, g, b] = transformed;
  const output: Color = {
    r: clampChannel(fromLinearChannel(clampChannel(r))),
    g: clampChannel(fromLinearChannel(clampChannel(g))),
    b: clampChannel(fromLinearChannel(clampChannel(b))),
    a: color.a,
  };
  return toHex(output);
}

function achromatic(linear: Vector3): Vector3 {
  const [r, g, b] = linear;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [luminance, luminance, luminance];
}

export function auditChartPalette(tokens: Tokens): ChartPaletteAudit {
  const colors = chartTokenNames.map(name => tokens[name]);
  return {
    normal: auditDistances(colors),
    protanopia: auditDistances(colors.map(color => simulateColorVision(color, "protanopia"))),
    deuteranopia: auditDistances(colors.map(color => simulateColorVision(color, "deuteranopia"))),
    tritanopia: auditDistances(colors.map(color => simulateColorVision(color, "tritanopia"))),
    achromatopsia: auditDistances(colors.map(color => simulateColorVision(color, "achromatopsia"))),
  };
}

export function validateChartPalette(tokens: Tokens): string[] {
  const audit = auditChartPalette(tokens);
  const gates: readonly (readonly [string, PalettePairDistance, number])[] = [
    ["normal", audit.normal.minimumAdjacent, chartPaletteThresholds.normalAdjacent],
    ["protanopia", audit.protanopia.minimumAdjacent, chartPaletteThresholds.simulatedAdjacent],
    ["deuteranopia", audit.deuteranopia.minimumAdjacent, chartPaletteThresholds.simulatedAdjacent],
    ["tritanopia", audit.tritanopia.minimumAdjacent, chartPaletteThresholds.simulatedAdjacent],
  ];
  return gates.flatMap(([simulation, pair, minimum]) => pair.distance < minimum
    ? [`chart-${pair.first} to chart-${pair.second} under ${simulation}: ${pair.distance.toFixed(3)} CAM16-UCS < ${minimum}`]
    : []);
}

function auditDistances(colors: readonly string[]): PaletteDistanceAudit {
  const coordinates = colors.map(colorToCam16Ucs);
  const pairs: PalettePairDistance[] = [];
  const adjacent: PalettePairDistance[] = [];
  for (let first = 0; first < colors.length; first += 1) {
    const firstColor = coordinates[first];
    if (firstColor === undefined) throw new Error(`Missing chart color ${first + 1}`);
    for (let second = first + 1; second < colors.length; second += 1) {
      const secondColor = coordinates[second];
      if (secondColor === undefined) throw new Error(`Missing chart color ${second + 1}`);
      const pair = { first: first + 1, second: second + 1, distance: Math.hypot(firstColor.j - secondColor.j, firstColor.a - secondColor.a, firstColor.b - secondColor.b) };
      pairs.push(pair);
      if (second === first + 1) adjacent.push(pair);
    }
  }
  const minimum = (items: readonly PalettePairDistance[]): PalettePairDistance => {
    const first = items[0];
    if (!first) throw new Error("A chart palette requires at least two colors");
    return items.reduce((smallest, item) => item.distance < smallest.distance ? item : smallest, first);
  };
  return { minimumAdjacent: minimum(adjacent), minimumPair: minimum(pairs) };
}
