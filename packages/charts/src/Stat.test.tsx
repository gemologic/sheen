import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Stat, StatGroup } from "./Stat.tsx";
import type { StatTrend, StatValence } from "./chart-types.ts";

describe("Stat and StatGroup", () => {
  it("keeps the complete value and supplementary visual in semantic definitions during SSR", () => {
    let reads = 0;
    const props = { label: "Utilization", value: "65%", get visual() { reads++; return <meter aria-label="Used capacity" value={65} min={0} max={100} />; } };
    const html = renderToString(() => <Stat {...props} />);
    expect(html).toContain("65%");
    expect(html).toContain('class="sheen-stat-visual"');
    expect(html).toContain('aria-label="Used capacity"');
    expect(html.match(/<meter/gu)).toHaveLength(1);
    expect(reads).toBe(1);
  });
  it("renders semantic labels, values, and a visible non-color trend", () => {
    const html = renderToString(() => <Stat label="Error rate" value="0.18%" trend="down" trendLabel="0.04 points lower" />);
    expect(html).toContain("<dl");
    expect(html).toContain("<dt");
    expect(html).toContain("<dd");
    expect(html).toContain('data-trend="down"');
    expect(html).toContain("0.04 points lower");
    expect(html).toContain('aria-hidden="true"');
  });

  it("groups one or more related stat definitions", () => {
    const html = renderToString(() => <StatGroup label="Service health" stats={[
      { label: "Requests", value: 18200, trend: "up", trendLabel: "8 percent higher" },
      { label: "p99", value: "43 ms", trend: "flat", trendLabel: "unchanged" },
    ]} />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Service health"');
    expect(html.match(/class="sheen-stat sheen-stat-group-item"/gu)).toHaveLength(2);
  });

  it("keeps the meaning independent of all three directions", () => {
    const directions: readonly StatTrend[] = ["up", "down", "flat"];
    const meanings: readonly StatValence[] = ["positive", "negative", "neutral"];
    for (const trend of directions) {
      for (const valence of meanings) {
        const html = renderToString(() => <Stat label="Metric" value="12" trend={trend} valence={valence} trendLabel="Compared with yesterday" />);
        expect(html).toContain(`data-trend="${trend}"`);
        expect(html).toContain(`data-valence="${valence}"`);
        expect(html).toContain("Compared with yesterday");
      }
      expect(renderToString(() => <Stat label="Metric" value="12" trend={trend} trendLabel="Compared with yesterday" />)).toContain('data-valence="neutral"');
    }
  });

  it("resolves an inline stats getter once for validation and rendering", () => {
    let reads = 0;
    const props = { label: "Metrics", get stats() { reads++; return [{ label: "Requests", value: 1200 }]; } };
    const html = renderToString(() => <StatGroup {...props} />);
    expect(html).toContain("1200");
    expect(reads).toBe(1);
  });

  it("rejects ambiguous or invalid display contracts", () => {
    expect(() => renderToString(() => <Stat label="Metric" value={Number.NaN} />)).toThrow("finite");
    expect(() => renderToString(() => <Stat label="Metric" value="12" trend="up" />)).toThrow("trendLabel");
    expect(() => renderToString(() => <Stat label="Metric" value="12" trendLabel="higher" />)).toThrow("requires a trend");
    expect(() => renderToString(() => <Stat label="Metric" value="12" valence="positive" />)).toThrow("valence requires a trend");
    expect(() => renderToString(() => <StatGroup label="Metrics" stats={[]} />)).toThrow("at least one");
  });
});
