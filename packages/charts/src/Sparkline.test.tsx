import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Sparkline, sparklinePath } from "./Sparkline.tsx";

describe("Sparkline", () => {
  it("creates separate path segments around NaN gaps", () => {
    const path = sparklinePath(new Float64Array([1, 3, Number.NaN, 2, 4]), 100, 20);
    expect(path.match(/M/gu)).toHaveLength(2);
    expect(path).not.toContain("NaN");
    expect(path).toContain("M1 19 L25.5 7");
    expect(path).toContain("M74.5 13 L99 1");
  });

  it("centers flat and single-point series", () => {
    expect(sparklinePath(new Float64Array([4, 4]), 100, 20)).toBe("M1 10 L99 10");
    expect(sparklinePath(new Float64Array([4]), 100, 20)).toBe("M50 10");
    expect(sparklinePath(new Float64Array([Number.NaN]), 100, 20)).toBe("");
  });

  it("rejects non-Float64 and infinite inputs instead of coercing them", () => {
    expect(() => sparklinePath(new Float64Array([1, Number.POSITIVE_INFINITY]), 100, 20)).toThrow("value 1");
    // @ts-expect-error Runtime validation also protects JavaScript consumers.
    expect(() => sparklinePath([1, 2], 100, 20)).toThrow("Float64Array");
  });

  it("renders deterministic sized SVG markup and an explicit empty state", () => {
    const html = renderToString(() => <Sparkline values={new Float64Array([1, Number.NaN, 2])} label="Latency trend" color="market-down" width={90} height={24} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Latency trend"');
    expect(html).toContain('data-color="market-down"');
    expect(html).toContain('viewBox="0 0 90 24"');
    expect(html.match(/M/gu)).toHaveLength(2);
    const empty = renderToString(() => <Sparkline values={new Float64Array()} label="No samples" />);
    expect(empty).toContain('d=""');
  });

  it("validates labels and dimensions", () => {
    expect(() => renderToString(() => <Sparkline values={new Float64Array([1])} label=" " />)).toThrow("nonempty label");
    expect(() => renderToString(() => <Sparkline values={new Float64Array([1])} label="Value" width={0} />)).toThrow("positive finite");
  });
});
