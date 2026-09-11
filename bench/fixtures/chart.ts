export const chartBenchmarkFixture = Object.freeze({
  schema: 1,
  seed: 0x5ee11,
  points: 100_000,
  series: 4,
  streamInitialPoints: 1_024,
  streamSamples: 120,
  streamIntervalMs: 1_000 / 60,
  themeCharts: 20,
  themePoints: 16,
});

export interface ChartBenchmarkData {
  readonly [key: string]: Float64Array;
  readonly t: Float64Array;
  readonly primary: Float64Array;
  readonly secondary: Float64Array;
  readonly tertiary: Float64Array;
  readonly quaternary: Float64Array;
}

function nextRandom(state: number): number {
  let value = state | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value | 0;
}

export function createChartBenchmarkData(points: number, seed: number = chartBenchmarkFixture.seed): ChartBenchmarkData {
  if (!Number.isSafeInteger(points) || points < 1) throw new Error("Chart benchmark points must be a positive safe integer");
  if (!Number.isSafeInteger(seed)) throw new Error("Chart benchmark seed must be a safe integer");
  const t = new Float64Array(points);
  const primary = new Float64Array(points);
  const secondary = new Float64Array(points);
  const tertiary = new Float64Array(points);
  const quaternary = new Float64Array(points);
  const start = Date.UTC(2026, 0, 1);
  let state: number = seed;
  for (let index = 0; index < points; index++) {
    state = nextRandom(state);
    const jitter = (state >>> 0) / 0xffff_ffff - 0.5;
    t[index] = start + index * 1_000;
    primary[index] = 48 + Math.sin(index / 211) * 8 + jitter;
    secondary[index] = 62 + Math.cos(index / 307) * 12 - jitter * 2;
    tertiary[index] = 34 + Math.sin(index / 149) * 5 + jitter;
    quaternary[index] = 76 + Math.cos(index / 431) * 10 + jitter * 3;
  }
  return Object.freeze({ t, primary, secondary, tertiary, quaternary });
}
