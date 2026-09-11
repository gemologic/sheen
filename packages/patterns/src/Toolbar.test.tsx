import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { Toolbar } from "./Toolbar.tsx";

describe("Toolbar SSR", () => {
  it("starts with accessible overflow and inert measurable inline groups without invoking actions", () => {
    let attempts = 0;
    const html = renderToString(() => <ThemeProvider><Toolbar label="Actions" filter={<input aria-label="Filter" />} groups={[{ id: "file", label: "File", items: [{ kind: "action", id: "save", label: "Save", onSelect: () => { attempts++; } }] }]} /></ThemeProvider>);
    expect(attempts).toBe(0);
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Actions"');
    expect(html).toContain("More actions");
    expect(html).toContain('data-overflow="true" inert');
    expect(html).toContain('aria-label="Filter"');
  });
  it("rejects duplicate IDs and blank labels", () => {
    expect(() => renderToString(() => <ThemeProvider><Toolbar label=" " groups={[]} /></ThemeProvider>)).toThrow("nonempty label");
    expect(() => renderToString(() => <ThemeProvider><Toolbar label="Actions" groups={[{ id: "empty", label: "Empty", items: [] }]} /></ThemeProvider>)).toThrow("and items");
  });
});
