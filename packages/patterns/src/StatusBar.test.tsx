import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "@gemologic/sheen";
import { StatusBar } from "./StatusBar.tsx";

describe("StatusBar SSR", () => {
  it("renders app state and scoped messages with explicit locale formatting", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{ connected: "Verbunden", backgroundTasks: "Hintergrundaufgaben" }}><StatusBar connection="connected" tasks={1200} counts={[{ label: "Zeilen", value: 2345 }]} /></ThemeScope></ThemeProvider>);
    expect(html).toContain('role="group"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Verbunden");
    expect(html).toContain("Hintergrundaufgaben");
    expect(html).toContain("1.200");
    expect(html).toContain("2.345");
    const liveRegion = html.match(/<div role="status"[^>]*>(.*?)<\/div>/s)?.[1];
    expect(liveRegion).toContain("Verbunden");
    expect(liveRegion).not.toContain("Zeilen");
  });
  it("does not invent a connection and preserves supplied actions", () => {
    const html = renderToString(() => <ThemeProvider><StatusBar tasks={0} label="Workspace" hidden><button>Retry</button></StatusBar></ThemeProvider>);
    expect(html).not.toContain("Connected");
    expect(html).not.toContain("data-pending");
    expect(html).not.toContain("data-connection");
    expect(html).toContain('data-idle="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('aria-label="Workspace"');
    expect(html).toMatch(/<button[^>]*>Retry<\/button>/);
    expect(html).toMatch(/\bhidden(?:[ =>])/);
  });
  it("rejects ambiguous labels and invalid counts", () => {
    for (const tasks of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => renderToString(() => <ThemeProvider><StatusBar tasks={tasks} /></ThemeProvider>)).toThrow("safe integer");
    }
    expect(() => renderToString(() => <ThemeProvider><StatusBar label=" " /></ThemeProvider>)).toThrow("nonempty label");
    expect(() => renderToString(() => <ThemeProvider><StatusBar counts={[{ label: "Rows", value: -1 }]} /></ThemeProvider>)).toThrow("safe integers");
    expect(() => renderToString(() => <ThemeProvider><StatusBar counts={[{ label: "Rows", value: 1 }, { label: "Rows", value: 2 }]} /></ThemeProvider>)).toThrow("unique nonempty");
  });
});
