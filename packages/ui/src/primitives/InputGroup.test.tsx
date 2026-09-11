import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { InputGroup } from "./InputGroup.tsx";

describe("InputGroup SSR", () => {
  it("resolves component addons once rather than recreating them while checking presence", () => {
    let renders = 0;
    function Addon() { renders += 1; return <button type="button">Action</button>; }
    const html = renderToString(() => <InputGroup label="Query" startContent={<Addon />} />);
    expect(renders).toBe(1);
    expect(html.match(/<button\b/g)).toHaveLength(1);
  });
  it("keeps one label and native input properties with associated errors", () => {
    const html = renderToString(() => <InputGroup label="Amount (USD)" id="amount" name="amount" inputMode="decimal" endContent="USD" error="Enter an amount" required class="custom" />);
    expect(html.match(/<label\b/g)).toHaveLength(1);
    expect(html.match(/<input\b/g)).toHaveLength(1);
    expect(html).toContain('for="amount"');
    expect(html).toContain('id="amount"');
    expect(html).toContain('name="amount"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("custom");
    expect(html).toContain("Enter an amount");
    expect(html).toContain("USD");
  });
  it("retains addon DOM order without inventing group or live-region roles", () => {
    const html = renderToString(() => <InputGroup label="Query" startContent={<button type="button">Before</button>} endContent={<button type="button">After</button>} disabled />);
    expect(html.indexOf("Before")).toBeLessThan(html.indexOf("<input"));
    expect(html.indexOf("After")).toBeGreaterThan(html.indexOf("<input"));
    expect(html).not.toMatch(/role="group"|aria-live/);
    expect(html.match(/ disabled/g)).toHaveLength(1);
  });
});
