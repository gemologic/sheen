import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { DataTableToolbar } from "./DataTableToolbar.tsx";

describe("DataTableToolbar SSR", () => {
  it("renders one named capability toolbar with direct and overflow access", () => {
    const html = renderToString(() => <ThemeProvider><DataTableToolbar label="Accounts table controls" query={<input aria-label="Search accounts" />}
      result="24 results" resultPrevious="Previous results" actions={[
        { kind: "action", id: "select", label: "Select all matching", onSelect: () => {} },
        { kind: "menu", id: "columns", label: "Columns", items: [{ kind: "action", id: "reset", label: "Reset", onSelect: () => {} }] },
      ]} /></ThemeProvider>);
    expect(html).toContain('role="toolbar" aria-label="Accounts table controls"');
    expect(html).toContain('aria-label="Search accounts"');
    expect(html).toContain("24 results");
    expect(html).toContain("Previous results");
    expect(html).toContain('data-previous=""');
    expect(html).toContain(">Select all matching</button>");
    expect(html).toContain(">Columns</button>");
    expect(html).toContain(">More actions</button>");
  });

  it("rejects malformed capability models before rendering", () => {
    expect(() => renderToString(() => <ThemeProvider><DataTableToolbar label=" " actions={[]} /></ThemeProvider>)).toThrow("nonempty label");
    expect(() => renderToString(() => <ThemeProvider><DataTableToolbar label="Table controls" actions={[
      { kind: "action", id: "same", label: "First", onSelect: () => {} },
      { kind: "action", id: "same", label: "Second", onSelect: () => {} },
    ]} /></ThemeProvider>)).toThrow("unique nonempty");
  });
});
