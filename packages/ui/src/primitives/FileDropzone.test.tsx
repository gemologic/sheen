import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { FileDropzone } from "./FileDropzone.tsx";

describe("FileDropzone server contract", () => {
  it("renders a native picker and complete app-owned upload states", () => {
    const html = renderToString(() => <ThemeProvider hydration="cookie"><FileDropzone label="Documents" description="Text only" accept="text/plain" multiple onFilesSelected={() => {}} items={[
      { id: "upload", name: "notes.txt", size: 1200, type: "text/plain", status: "uploading", statusLabel: "Uploading", progress: 0.5 },
      { id: "failed", name: "failed.txt", size: 4, status: "error", statusLabel: "Upload failed" },
    ]} onRetry={() => {}} onRemove={() => {}} /></ThemeProvider>);
    expect(html).toContain('type="file"');
    expect(html).toContain('accept="text/plain"');
    expect(html).toContain("Choose files");
    expect(html).toContain("notes.txt");
    expect(html).toContain("Uploading");
    expect(html).toContain("Upload failed");
    expect(html).toContain("<progress");
    expect(html).toContain("Retry");
  });

  it("rejects invalid configuration and app-owned records", () => {
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><FileDropzone label="Files" maxFiles={0} onFilesSelected={() => {}} /></ThemeProvider>)).toThrow("maxFiles must be a positive integer");
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><FileDropzone label="Files" onFilesSelected={() => {}} items={[{ id: "same", name: "a", size: 1, status: "queued", statusLabel: "Queued" }, { id: "same", name: "b", size: 1, status: "queued", statusLabel: "Queued" }]} /></ThemeProvider>)).toThrow("duplicate item ID");
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><FileDropzone label="Files" onFilesSelected={() => {}} items={[{ id: "bad", name: "bad", size: 1, status: "uploading", statusLabel: "Uploading", progress: 2 }]} /></ThemeProvider>)).toThrow("invalid progress");
  });
});
