import { defaultThemeState, readThemeState } from "@gemologic/sheen";
import type { ThemeState } from "@gemologic/sheen";

export interface LabState extends ThemeState {
  readonly width: number;
  readonly height: number;
  readonly baselineGrid: boolean;
  readonly spacingOutlines: boolean;
  readonly focusRings: boolean;
  readonly forceState: LabForceState;
  readonly colorVision: LabColorVision;
  readonly visionBlur: LabVisionBlur;
  readonly performanceMeter: boolean;
}

export type LabForceState = "none" | "hover" | "active" | "focus" | "disabled";
export type LabColorVision = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";
export type LabVisionBlur = 0 | 1.5 | 3;

export const defaultLabState: Readonly<LabState> = Object.freeze({
  ...defaultThemeState,
  width: 1024,
  height: 720,
  baselineGrid: false,
  spacingOutlines: false,
  focusRings: false,
  forceState: "none",
  colorVision: "normal",
  visionBlur: 0,
  performanceMeter: false,
});

function dimension(value: string | null, fallback: number, minimum: number, maximum: number): number {
  if (value === null || !/^\d+$/u.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function booleanValue(value: string | null, fallback: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function member<T extends string>(value: string | null, accepted: readonly T[], fallback: T): T {
  for (const candidate of accepted) {
    if (candidate === value) return candidate;
  }
  return fallback;
}

function blurValue(value: string | null, fallback: LabVisionBlur): LabVisionBlur {
  if (value === "0") return 0;
  if (value === "1.5") return 1.5;
  if (value === "3") return 3;
  return fallback;
}

export function parseLabState(search: string, fallback: Readonly<LabState> = defaultLabState): LabState {
  const parameters = new URLSearchParams(search);
  const theme = readThemeState(Object.fromEntries(parameters), fallback);
  return {
    ...theme,
    width: dimension(parameters.get("width"), fallback.width, 320, 1600),
    height: dimension(parameters.get("height"), fallback.height, 320, 1200),
    baselineGrid: booleanValue(parameters.get("baselineGrid"), fallback.baselineGrid),
    spacingOutlines: booleanValue(parameters.get("spacingOutlines"), fallback.spacingOutlines),
    focusRings: booleanValue(parameters.get("focusRings"), fallback.focusRings),
    forceState: member(parameters.get("forceState"), ["none", "hover", "active", "focus", "disabled"], fallback.forceState),
    colorVision: member(parameters.get("colorVision"), ["normal", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"], fallback.colorVision),
    visionBlur: blurValue(parameters.get("visionBlur"), fallback.visionBlur),
    performanceMeter: booleanValue(parameters.get("performanceMeter"), fallback.performanceMeter),
  };
}

export function serializeLabState(state: LabState): string {
  return new URLSearchParams({
    theme: state.theme,
    mode: state.mode,
    accent: state.accent,
    density: state.density,
    radius: state.radius,
    motion: state.motion,
    direction: state.direction,
    locale: state.locale,
    width: String(state.width),
    height: String(state.height),
    baselineGrid: String(state.baselineGrid),
    spacingOutlines: String(state.spacingOutlines),
    focusRings: String(state.focusRings),
    forceState: state.forceState,
    colorVision: state.colorVision,
    visionBlur: String(state.visionBlur),
    performanceMeter: String(state.performanceMeter),
  }).toString();
}

export interface LabStateMessage {
  readonly kind: "sheen-lab-state";
  readonly search: string;
}

export interface ComparisonState {
  readonly first: LabState;
  readonly second: LabState;
}

export const defaultComparisonState: Readonly<ComparisonState> = Object.freeze({
  first: Object.freeze({ ...defaultLabState, density: "compact", width: 375, height: 560 }),
  second: Object.freeze({ ...defaultLabState, theme: "paper", mode: "light", accent: "rose", density: "spacious", width: 1024, height: 560 }),
});

function paneSearch(parameters: URLSearchParams, pane: keyof ComparisonState): string {
  const result = new URLSearchParams();
  const prefix = `${pane}.`;
  for (const [name, value] of parameters) {
    if (name.startsWith(prefix)) result.set(name.slice(prefix.length), value);
  }
  return result.toString();
}

export function parseComparisonState(search: string): ComparisonState {
  const parameters = new URLSearchParams(search);
  return {
    first: parseLabState(paneSearch(parameters, "first"), defaultComparisonState.first),
    second: parseLabState(paneSearch(parameters, "second"), defaultComparisonState.second),
  };
}

export function serializeComparisonState(state: ComparisonState): string {
  const parameters = new URLSearchParams();
  for (const pane of ["first", "second"] satisfies readonly (keyof ComparisonState)[]) {
    for (const [name, value] of new URLSearchParams(serializeLabState(state[pane]))) parameters.set(`${pane}.${name}`, value);
  }
  return parameters.toString();
}

export function readLabStateMessage(value: unknown): LabState | undefined {
  if (typeof value !== "object" || value === null || !("kind" in value) || value.kind !== "sheen-lab-state" || !("search" in value) || typeof value.search !== "string") return undefined;
  return parseLabState(value.search);
}
