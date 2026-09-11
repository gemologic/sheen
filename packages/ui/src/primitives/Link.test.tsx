import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Link } from "./Link.tsx";

describe("Link SSR", () => {
  it("renders a native named anchor without a provider or button semantics", () => {
    const html = renderToString(() => <Link href="/orders?status=open" class="custom" target="_blank" rel="noopener" aria-current="page">Orders</Link>);
    expect(html).toContain('<a ');
    expect(html).toContain('href="/orders?status=open"');
    expect(html).toMatch(/class="sheen-link custom\s*"/);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-link-variant="text"');
    expect(html).not.toMatch(/<button|role=|tabindex=|type="button"/);
  });
  it("changes appearance without changing native download attributes or role", () => {
    const html = renderToString(() => <Link href="/report.csv" variant="button" download="report.csv" type="text/csv">Download report</Link>);
    expect(html).toContain('class="sheen-link sheen-button sheen-button-ghost sheen-button-neutral sheen-button-md');
    expect(html).toContain('data-link-variant="button"');
    expect(html).toContain('download="report.csv"');
    expect(html).toContain('type="text/csv"');
    expect(html).not.toMatch(/<button|role=|tabindex=/);
  });
});
