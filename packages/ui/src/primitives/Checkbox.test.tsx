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
});
