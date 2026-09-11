import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { SplitLayout } from "./SplitLayout.tsx";

describe("SplitLayout", () => {
  it("renders one deterministic pair of labeled panes and its adjustable separator on the server", () => {
    const html = renderToString(() => <ThemeProvider><SplitLayout label="Editor" startLabel="Source" endLabel="Preview" handleLabel="Resize source and preview" defaultSizes={[0.4, 0.6]} start={<textarea>draft</textarea>} end={<article>preview</article>} /></ThemeProvider>);
    expect(html.match(/>draft</gu)).toHaveLength(1);
    expect(html.match(/>preview</gu)).toHaveLength(1);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Source"');
    expect(html).toContain('aria-label="Preview"');
    expect(html).toContain('aria-label="Resize source and preview"');
    expect(html).toContain("flex-basis:40%");
    expect(html).toContain('data-narrow-layout="stack"');
  });

  it("uses app-owned server-known persistence geometry", () => {
    const html = renderToString(() => <ThemeProvider><SplitLayout label="Workspace" startLabel="Files" endLabel="Document" handleLabel="Resize files and document"
      persistence={{ initialSizes: [0.3, 0.7], save: () => {}, onError: () => {} }} refreshing start="files" end="document" /></ThemeProvider>);
    expect(html).toContain("flex-basis:30%");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-refreshing="true"');
  });

  it("rejects empty accessible names before rendering", () => {
    expect(() => renderToString(() => <ThemeProvider><SplitLayout label=" " startLabel="Start" endLabel="End" handleLabel="Resize" start="a" end="b" /></ThemeProvider>)).toThrow("nonempty label");
    expect(() => renderToString(() => <ThemeProvider><SplitLayout label="Layout" startLabel="Start" endLabel="End" handleLabel=" " start="a" end="b" /></ThemeProvider>)).toThrow("nonempty handleLabel");
  });

  it("assigns unique panel identities when layouts share a document", () => {
    const html = renderToString(() => <ThemeProvider><>
      <SplitLayout label="Editor" startLabel="Source" endLabel="Preview" handleLabel="Resize editor" start="source" end="preview" />
      <SplitLayout label="Inspector" startLabel="Tree" endLabel="Details" handleLabel="Resize inspector" start="tree" end="details" />
    </></ThemeProvider>);
    const panelIds = Array.from(html.matchAll(/id="([^"]+-(?:start|end))"/gu), match => match[1]);
    expect(panelIds).toHaveLength(4);
    expect(new Set(panelIds).size).toBe(4);
  });
});
