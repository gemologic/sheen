import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen/core";
import { DiffViewer } from "./DiffViewer.tsx";
import { JSONViewer } from "./JSONViewer.tsx";
import { LogViewer } from "./LogViewer.tsx";
import type { LogEntry } from "./LogViewer.tsx";
import { createDiffRows } from "./diff.ts";
import { stringifyViewerJson } from "./json.ts";
import { filterViewerRows, viewerWindow } from "./viewer-model.ts";

describe("advanced viewer models", () => {
  it("builds a deterministic exact ordinary diff with non-color prefixes", () => {
    const diff = createDiffRows("one\ntwo\nthree", "one\nsecond\nthree\nfour", "old.txt", "new.txt");
    expect(diff.rows.map(row => [row.kind, row.text, row.oldLine, row.newLine])).toEqual([
      ["context", "one", 1, 1], ["removed", "two", 2, undefined], ["added", "second", undefined, 2], ["context", "three", 3, 3], ["added", "four", undefined, 4],
    ]);
    expect(diff.unified).toBe("--- old.txt\n+++ new.txt\n one\n-two\n+second\n three\n+four");
  });

  it("computes bounded virtual windows and locale-aware search", () => {
    expect(viewerWindow(10_000, 2_200, 220, 22)).toEqual({ start: 96, end: 114, offsetBefore: 2_112, offsetAfter: 217_492 });
    expect(filterViewerRows([{ id: "one", text: "İstanbul" }, { id: "two", text: "Ankara" }], "istanbul", "tr")).toEqual([{ id: "one", text: "İstanbul" }]);
  });

  it("sorts JSON deterministically and rejects unsafe values", () => {
    expect(stringifyViewerJson({ z: 1, a: { d: true, c: null } }, 2, true, 8).text).toBe('{\n  "a": {\n    "c": null,\n    "d": true\n  },\n  "z": 1\n}');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => stringifyViewerJson(cyclic, 2, true, 8)).toThrow("cycle");
    expect(() => stringifyViewerJson({ value: Number.NaN }, 2, true, 8)).toThrow("finite");
  });
});

describe("advanced viewer SSR", () => {
  it("renders complete accessible chrome but only a bounded initial window for large content", () => {
    const entries = Array.from({ length: 10_000 }, (_, index): LogEntry => ({ id: `log-${index}`, timestamp: `2026-09-09T12:${String(index % 60).padStart(2, "0")}:00Z`, level: index % 101 === 0 ? "error" : "info", message: `Processed record ${index}` }));
    const html = renderToString(() => <ThemeProvider><LogViewer entries={entries} label="Worker logs" initialHeight={220} /></ThemeProvider>);
    expect(html).toContain('aria-label="Worker logs"');
    expect(html).toContain('aria-label="Worker logs lines"');
    expect(html).toContain("10000 of 10000 lines");
    expect(html.match(/role="listitem"/gu)?.length).toBeLessThanOrEqual(20);
    expect(html).not.toContain("Processed record 9999");
  });

  it("renders escaped diff and deterministic JSON without publishing source as markup", () => {
    const diff = renderToString(() => <ThemeProvider><DiffViewer oldText={'<script>old</script>'} newText={'<script>new</script>'} label="Safe diff" /></ThemeProvider>);
    const json = renderToString(() => <ThemeProvider><JSONViewer value={{ value: "<safe>" }} label="Safe JSON" /></ThemeProvider>);
    expect(diff).toContain("&lt;script>old&lt;/script>");
    expect(diff).not.toContain('class="sheen-text-viewer-content"><script>old</script>');
    expect(json).toContain("&lt;safe>");
    expect(json).not.toContain('class="sheen-text-viewer-content"><safe>');
  });
});
