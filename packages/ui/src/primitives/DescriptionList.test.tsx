import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "./DescriptionList.tsx";

describe("description list SSR", () => {
  it("renders native name/value semantics without interactive or live roles", () => {
    const html = renderToString(() => <DescriptionList aria-label="Order"><DescriptionTerm>Symbol</DescriptionTerm><DescriptionDetails>BTC</DescriptionDetails></DescriptionList>);
    expect(html).toMatch(/^<dl\b/);
    expect(html).toContain('data-layout="stacked"');
    expect(html).toContain('aria-label="Order"');
    expect(html).toMatch(/<dt\b[^>]*>Symbol<\/dt>/);
    expect(html).toMatch(/<dd\b[^>]*>BTC<\/dd>/);
    expect(html).not.toMatch(/role=|tabindex=|aria-live=/);
  });
  it("retains native attributes and optional tabular figures", () => {
    const html = renderToString(() => <DescriptionList layout="columns" class="custom" dir="rtl"><DescriptionTerm id="amount">Amount</DescriptionTerm><DescriptionDetails numeric aria-labelledby="amount" title="Exact amount">12.34</DescriptionDetails><DescriptionTerm hidden>Private</DescriptionTerm><DescriptionDetails hidden>Hidden</DescriptionDetails></DescriptionList>);
    expect(html).toContain('data-layout="columns"');
    expect(html).toContain('data-numeric="true"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("custom");
    expect(html).toContain('aria-labelledby="amount"');
    expect(html).toContain('title="Exact amount"');
    expect(html.match(/ hidden/g)).toHaveLength(2);
    expect(renderToString(() => <DescriptionDetails numeric={false}>Text</DescriptionDetails>)).not.toContain("data-numeric");
  });
});
