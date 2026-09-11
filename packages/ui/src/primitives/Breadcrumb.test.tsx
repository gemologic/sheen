import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Breadcrumb } from "./Breadcrumb.tsx";

describe("Breadcrumb SSR", () => {
  it("renders a localized landmark, real ancestor URLs, and current-page text", () => {
    const html = renderToString(() => <ThemeProvider messages={{ breadcrumb: "Page hierarchy" }}><Breadcrumb items={[{ id: "home", label: "Home", href: "/" }, { id: "current", label: "Current" }]} /></ThemeProvider>);
    expect(html).toContain('aria-label="Page hierarchy"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-current="page"');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });
  it("rejects empty or ambiguous hierarchies", () => {
    for (const items of [[], [{ id: "x", label: "" }], [{ id: "x", label: "Parent" }, { id: "y", label: "Child" }], [{ id: "x", label: "Parent", href: "/" }, { id: "x", label: "Child" }]]) {
      expect(() => renderToString(() => <ThemeProvider><Breadcrumb items={items} /></ThemeProvider>)).toThrow("Breadcrumb");
    }
  });
});
