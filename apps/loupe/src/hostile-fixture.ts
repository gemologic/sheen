import type { MenuItem } from "@gemologic/sheen";
import { defineSeries } from "@gemologic/sheen-charts/core";
import type { ChartData, ChartSeries } from "@gemologic/sheen-charts/core";

export interface HostileRow {
  readonly id: string;
  readonly account: string;
  readonly locale: string;
  readonly status: "Active" | "Paused" | "Review";
  readonly amount: number;
}

export const hostileLongText = "0123456789".repeat(50);
export const hostileZeroWidthText = "alpha\u200Bbeta\u200Cgamma\u200Ddelta\u2060omega";
export const hostileMultilingualText = "مرحبا بالعالم · 中文測試 · 日本語テスト · नमस्ते दुनिया · 👩🏽‍💻🧪🚀";
export const hostileChartStart = Date.UTC(2026, 8, 9, 12, 0, 0);
const hostileChartColors: readonly ChartSeries["color"][] = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-6", "chart-7", "chart-8"];
const hostileChartEncodings: readonly NonNullable<ChartSeries["encoding"]>[] = ["dashed", "dotted", "dash-dot", "dashed"];

export const hostileChartSeries: readonly ChartSeries[] = defineSeries(Array.from({ length: 12 }, (_, index) => ({
  key: `signal${index + 1}`,
  label: `Signal ${index + 1}`,
  color: hostileChartColors[index % hostileChartColors.length] ?? "chart-1",
  ...(index < 8 ? {} : { encoding: hostileChartEncodings[index - 8] ?? "dashed" }),
})));

export function hostileChartSample(index: number): Float64Array {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("Hostile chart sample index must be a nonnegative safe integer");
  return new Float64Array(hostileChartSeries.map((_series, seriesIndex) => 40 + seriesIndex * 4 + Math.sin(index / (5 + seriesIndex)) * (8 + seriesIndex % 3)));
}

export function createHostileChartData(count = 64): ChartData {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Hostile chart sample count must be a positive safe integer");
  const data: { t: Float64Array; [key: string]: Float64Array } = { t: new Float64Array(count) };
  for (const series of hostileChartSeries) data[series.key] = new Float64Array(count);
  for (let index = 0; index < count; index++) {
    data.t[index] = hostileChartStart + index * 1_000;
    const sample = hostileChartSample(index);
    for (let seriesIndex = 0; seriesIndex < hostileChartSeries.length; seriesIndex++) {
      const key = hostileChartSeries[seriesIndex]?.key;
      const column = key ? data[key] : undefined;
      if (column) column[index] = sample[seriesIndex] ?? Number.NaN;
    }
  }
  return Object.freeze(data);
}

const statuses: readonly HostileRow["status"][] = ["Active", "Paused", "Review"];

export function createHostileRows(count = 100_000): readonly HostileRow[] {
  if (!Number.isInteger(count) || count <= 0) throw new Error("Hostile row count must be a positive integer");
  return Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({
    id: `hostile-row-${index + 1}`,
    account: index === 0 ? hostileLongText : index === 1 ? hostileZeroWidthText : index === 2 ? hostileMultilingualText : `Account ${String(index + 1).padStart(6, "0")}`,
    locale: index % 4 === 0 ? "العربية" : index % 4 === 1 ? "中文" : index % 4 === 2 ? "English 👩🏽‍💻" : "עברית",
    status: statuses[index % statuses.length] ?? "Review",
    amount: ((index * 7_919) % 1_000_000) / 100,
  })));
}

export function createHostileMenu(onSelect: (id: string) => void): readonly MenuItem[] {
  let items: readonly MenuItem[] = Object.freeze(Array.from({ length: 193 }, (_, index): MenuItem => Object.freeze({
    kind: "action",
    id: `hostile-action-${index + 1}`,
    label: index === 0 ? `First action ${hostileMultilingualText}` : `Action ${String(index + 1).padStart(3, "0")} ${index % 7 === 0 ? hostileZeroWidthText : ""}`,
    onSelect: () => onSelect(`hostile-action-${index + 1}`),
  })));
  for (let depth = 7; depth >= 1; depth -= 1) {
    items = Object.freeze([Object.freeze({
      kind: "submenu",
      id: `hostile-level-${depth}`,
      label: `Level ${depth} ${depth % 2 === 0 ? "قائمة" : "菜单"}`,
      items,
    })]);
  }
  return items;
}

export function countHostileMenuItems(items: readonly MenuItem[]): number {
  let count = 0;
  for (const item of items) {
    count += 1;
    if (item.kind === "submenu") count += countHostileMenuItems(item.items);
    if (item.kind === "radio") count += item.options.length;
  }
  return count;
}

export function hostileMenuDepth(items: readonly MenuItem[]): number {
  let depth = 0;
  for (const item of items) {
    if (item.kind === "submenu") depth = Math.max(depth, 1 + hostileMenuDepth(item.items));
  }
  return depth;
}
