import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Stat, StatGroup } from "./Stat.tsx";

describe("Stat and StatGroup", () => {
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

  it("rejects ambiguous or invalid display contracts", () => {
    expect(() => renderToString(() => <Stat label="Metric" value={Number.NaN} />)).toThrow("finite");
    expect(() => renderToString(() => <Stat label="Metric" value="12" trend="up" />)).toThrow("trendLabel");
    expect(() => renderToString(() => <Stat label="Metric" value="12" trendLabel="higher" />)).toThrow("requires a trend");
    expect(() => renderToString(() => <StatGroup label="Metrics" stats={[]} />)).toThrow("at least one");
  });
});
