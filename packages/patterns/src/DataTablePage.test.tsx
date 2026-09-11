import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { DataTablePage } from "./DataTablePage.tsx";
import type { DataTablePageViews } from "./DataTablePage.tsx";

const views: DataTablePageViews = {
  records: [{ id: "open", name: "Open accounts" }], selectedId: "open", draftName: "Quarter close", pending: false,
  onSelectedChange: () => {}, onDraftNameChange: () => {}, onSave: () => {}, onRename: () => {}, onRestore: () => {}, onDelete: () => {}, onRetry: () => {},
};

function render(overrides: Partial<Parameters<typeof DataTablePage>[0]> = {}): string {
  return renderToString(() => <ThemeProvider><DataTablePage title="Accounts" toolbarLabel="Account actions" loadingFallback={<div>Reserved rows</div>} views={views} {...overrides}><div data-table-owner>Rows</div></DataTablePage></ThemeProvider>);
}

describe("DataTablePage", () => {
  it("composes controlled views, app actions, table content, and status on the server", () => {
    const html = render({ toolbarGroups: [{ id: "file", label: "File", items: [{ kind: "action", id: "new", label: "New", onSelect: () => {} }] }], status: <div>Connected</div> });
    expect(html).toContain("Accounts");
    expect(html).toContain("Account actions");
    expect(html).toContain("Open accounts");
    expect(html).toContain("data-table-owner");
    expect(html).toContain("Connected");
  });

  it("does not render an empty page toolbar when neither page actions nor saved views exist", () => {
    const html = renderToString(() => <ThemeProvider><DataTablePage title="Accounts" toolbarLabel="Account actions" loadingFallback={<div>Reserved rows</div>}><div data-table-owner>Rows</div></DataTablePage></ThemeProvider>);
    expect(html).not.toContain('role="toolbar"');
  });

  it("retains ready content for refresh but removes it from permission errors", () => {
    const refresh = render({ loadingPhase: "refresh" });
    expect(refresh).toContain('data-phase="refresh"');
    expect(refresh).toContain("data-table-owner");
    const denied = render({ state: "permission-denied" });
    expect(denied).toContain("Permission denied");
    expect(denied).not.toContain("data-table-owner");
    expect(denied).not.toContain("Open accounts");
  });

  it("fails closed on malformed view ownership and contradictory states", () => {
    expect(() => render({ views: { ...views, records: [{ id: "same", name: "One" }, { id: "same", name: "Two" }] } })).toThrow("unique");
    expect(() => render({ views: { ...views, selectedId: "missing" } })).toThrow("must exist");
    expect(() => render({
      // @ts-expect-error Runtime validation protects JavaScript and unchecked consumers.
      views: { ...views, onRename: undefined },
    })).toThrow("callbacks must be functions");
    expect(render({ state: "server-error", loadingPhase: "cold" })).toContain('data-phase="idle"');
  });
});
