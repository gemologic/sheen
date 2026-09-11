import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Collapsible } from "./Collapsible.tsx";

describe("Collapsible SSR", () => {
  it("retains closed content behind a native disabled disclosure and stable association", () => {
    const html = renderToString(() => <Collapsible id="advanced" label="Advanced" disabled><input value="Draft" /></Collapsible>);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="advanced-content"');
    expect(html).toContain('id="advanced-content"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("inert");
    expect(html).toContain("disabled");
    expect(html).toContain('value="Draft"');
  });
  it("renders default-open content and respects controlled false", () => {
    const expanded = renderToString(() => <Collapsible label="Expanded" defaultOpen>Content</Collapsible>);
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).not.toContain('aria-hidden="true" inert');
    const controlled = renderToString(() => <Collapsible label="Controlled" defaultOpen open={false}>Content</Collapsible>);
    expect(controlled).toContain('aria-expanded="false"');
  });
});
