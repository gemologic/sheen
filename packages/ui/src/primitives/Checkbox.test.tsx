import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Checkbox } from "./Checkbox.tsx";

describe("Checkbox server contract", () => {
  it("renders a labeled native form control and linked validation messages", () => {
    const html = renderToString(() => <Checkbox label="Accept terms" description="Read the terms" error="Consent required" required name="consent" value="yes" defaultChecked />);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="consent"');
    expect(html).toContain('value="yes"');
    expect(html).toMatch(/\bchecked(?:[ =>])/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Accept terms");
    expect(html).toContain("Consent required");
    expect(html).not.toContain("aria-live");
  });
  it("keeps controlled precedence, mixed presentation, and native disabled state", () => {
    const html = renderToString(() => <Checkbox label="All rows" checked={false} defaultChecked indeterminate disabled data-owner="table" />);
    const input = html.match(/<input\b[^>]*>/)?.[0];
    expect(input).toBeDefined();
    expect(input).not.toMatch(/\schecked(?:[ =>])/);
    expect(input).toMatch(/\bdisabled(?:[ =>])/);
    expect(html).toContain("data-indeterminate");
    expect(html).toContain('data-owner="table"');
    expect(input).toContain('name=""');
  });
  it("names an unlabeled native input with aria-label or aria-labelledby and renders no empty label", () => {
    const named = renderToString(() => <Checkbox aria-label="Select invoice 1042" />);
    expect(named.match(/<input\b[^>]*>/)?.[0]).toContain('aria-label="Select invoice 1042"');
    expect(named).not.toContain("<label");
    const referenced = renderToString(() => <Checkbox aria-labelledby="invoice-1042" />);
    expect(referenced.match(/<input\b[^>]*>/)?.[0]).toContain('aria-labelledby="invoice-1042"');
    // @ts-expect-error An accessible name source is required.
    const unnamed = () => <Checkbox name="selected" />;
    // @ts-expect-error Naming sources are mutually exclusive.
    const ambiguous = () => <Checkbox label="Visible" aria-label="Hidden" />;
    expect([unnamed, ambiguous]).toHaveLength(2);
  });
});
