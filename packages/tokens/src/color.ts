export interface Color { readonly r: number; readonly g: number; readonly b: number; readonly a: number }

export const toLinearChannel = (value: number): number => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
export const fromLinearChannel = (value: number): number => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
export const clampChannel = (value: number): number => Math.min(1, Math.max(0, value));

export function parseColor(value: string): Color {
  const hex = /^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.exec(value.trim())?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map(char => char + char).join("") : hex;
    return { r: parseInt(full.slice(0, 2), 16) / 255, g: parseInt(full.slice(2, 4), 16) / 255, b: parseInt(full.slice(4, 6), 16) / 255, a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1 };
  }
  if (value === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const oklch = /^oklch\(\s*([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(%?)\s+([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)\s+([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(?:\s*\/\s*([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(%?))?\s*\)$/i.exec(value);
  if (oklch) {
    const lightness = Number(oklch[1]) / (oklch[2] ? 100 : 1);
    const chroma = Number(oklch[3]);
    const hue = Number(oklch[4]) * Math.PI / 180;
    const alpha = oklch[5] === undefined ? 1 : Number(oklch[5]) / (oklch[6] ? 100 : 1);
    if (![lightness, chroma, hue, alpha].every(Number.isFinite) || lightness < 0 || lightness > 1 || chroma < 0 || alpha < 0 || alpha > 1) throw new Error(`Invalid color: ${value}`);
    return fromOklab(lightness, chroma * Math.cos(hue), chroma * Math.sin(hue), alpha);
  }
  const mix = /^color-mix\(in oklab,\s*(.+)\s+([\d.]+)%,\s*(.+)\)$/.exec(value);
  if (mix?.[1] && mix[2] && mix[3]) {
    const weight = Number(mix[2]) / 100;
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error(`Invalid mix weight: ${value}`);
    const first = parseColor(mix[1]);
    const second = parseColor(mix[3]);
    const x = toOklab(first), y = toOklab(second);
    const alpha = first.a * weight + second.a * (1 - weight);
    const w = alpha === 0 ? 0 : first.a * weight / alpha;
    return fromOklab(x.l * w + y.l * (1 - w), x.a * w + y.a * (1 - w), x.b * w + y.b * (1 - w), alpha);
  }
  throw new Error(`Unsupported concrete color: ${value}`);
}

function fromOklab(l: number, a: number, b: number, alpha: number): Color {
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return { r: clampChannel(fromLinearChannel(4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z)), g: clampChannel(fromLinearChannel(-1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z)), b: clampChannel(fromLinearChannel(-0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z)), a: alpha };
}

function toOklab(color: Color): { l: number; a: number; b: number } {
  const r = toLinearChannel(color.r), g = toLinearChannel(color.g), b = toLinearChannel(color.b);
  const x = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const y = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const z = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return { l: 0.2104542553 * x + 0.793617785 * y - 0.0040720468 * z, a: 1.9779984951 * x - 2.428592205 * y + 0.4505937099 * z, b: 0.0259040371 * x + 0.7827717662 * y - 0.808675766 * z };
}

export function composite(foreground: Color, background: Color): Color {
  const a = foreground.a + background.a * (1 - foreground.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const channel = (front: number, back: number): number => (front * foreground.a + back * background.a * (1 - foreground.a)) / a;
  return { r: channel(foreground.r, background.r), g: channel(foreground.g, background.g), b: channel(foreground.b, background.b), a };
}

export function contrastRatio(foreground: string, background: string): number {
  const back = parseColor(background);
  if (back.a !== 1) throw new Error("Contrast requires an opaque resolved background");
  const front = composite(parseColor(foreground), back);
  const luminance = (c: Color): number => 0.2126 * toLinearChannel(c.r) + 0.7152 * toLinearChannel(c.g) + 0.0722 * toLinearChannel(c.b);
  const a = luminance(front), b = luminance(back);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function toHex(color: Color): string {
  const byte = (value: number): string => Math.round(clampChannel(value) * 255).toString(16).padStart(2, "0");
  return `#${byte(color.r)}${byte(color.g)}${byte(color.b)}${color.a < 1 ? byte(color.a) : ""}`;
}

export function toOklch(value: string): string {
  const color = parseColor(value), lab = toOklab(color);
  const chroma = Math.hypot(lab.a, lab.b);
  const hue = (Math.atan2(lab.b, lab.a) * 180 / Math.PI + 360) % 360;
  return `oklch(${(lab.l * 100).toFixed(5)}% ${chroma.toFixed(7)} ${hue.toFixed(4)}${color.a < 1 ? ` / ${color.a.toFixed(5)}` : ""})`;
}
