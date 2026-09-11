import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { getAssets } from "solid-js/web";
import { MetaProvider } from "@solidjs/meta";
import { AppShell } from "./AppShell.tsx";
import { ShortcutProvider, ThemeProvider } from "@gemologic/sheen";
import { usePaneScrollRestoration } from "./pane-restoration.ts";
import { useUnsavedChanges } from "./unsaved-changes.ts";

describe("AppShell SSR", () => {
  it("hides a closed sidebar without removing its server content", () => {
    const html = renderToString(() => <ThemeProvider><AppShell label="Content" defaultSidebarOpen={false} sidebar={<input value="Retained sidebar" />} /></ThemeProvider>);
    expect(html).toMatch(/<aside[^>]*hidden[^>]*inert/);
    expect(html).toContain('value="Retained sidebar"');
    expect(html).toContain('data-sidebar="false"');
    expect(html).not.toContain("defaultSidebarOpen=");
    const controlled = renderToString(() => <ThemeProvider><AppShell label="Content" sidebarOpen={true} defaultSidebarOpen={false} sidebar={<p>Navigation</p>} /></ThemeProvider>);
    expect(controlled).toContain('data-sidebar="true"');
    expect(controlled).not.toMatch(/<aside[^>]*hidden/);
  });
  it("renders optional localized shortcut help without a server overlay", () => {
    const html = renderToString(() => <ThemeProvider messages={{ shortcutHelp: "Keyboard help" }}><ShortcutProvider development={true}><AppShell label="Content" shortcutHelp /></ShortcutProvider></ThemeProvider>);
    expect(html).toContain("Keyboard help");
    expect(html).toContain('aria-label="Pending shortcut"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain('shortcutHelp=');
    expect(() => renderToString(() => <ThemeProvider><AppShell label="Content" shortcutHelp /></ThemeProvider>)).toThrow("ShortcutProvider");
  });
  it("provides shell contexts before resolving chrome slots", () => {
    function Sidebar() {
      usePaneScrollRestoration("sidebar", () => undefined);
      useUnsavedChanges(() => true);
      return <p>Sidebar editor</p>;
    }
    expect(renderToString(() => <ThemeProvider><AppShell label="Content" sidebar={<Sidebar />} /></ThemeProvider>)).toContain("Sidebar editor");
  });
  it("renders semantic chrome and resolves each slot only once", () => {
    let headers = 0;
    let sidebars = 0;
    const Header = () => { headers++; return <h1>Workspace</h1>; };
    const Sidebar = () => { sidebars++; return <nav aria-label="Sections">Links</nav>; };
    const html = renderToString(() => <ThemeProvider><AppShell label="Workspace content" header={<Header />} sidebar={<Sidebar />} statusBar={<span>Ready</span>}><input value="Draft" /></AppShell></ThemeProvider>);
    expect(headers).toBe(1);
    expect(sidebars).toBe(1);
    expect(html).toContain("<header");
    expect(html).toContain("<aside");
    expect(html).toContain("<main");
    expect(html).toContain("<footer");
    expect(html).toContain('aria-label="Workspace content"');
    expect(html).toContain('value="Draft"');
  });
  it("omits absent chrome and requires a content label", () => {
    const html = renderToString(() => <AppShell label="Content">Content</AppShell>);
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("<header");
    expect(html).not.toContain("<footer");
    expect(html).toContain('data-sidebar="false"');
    expect(() => renderToString(() => <AppShell label=" " />)).toThrow("content label");
  });
  it("registers an escaped accepted-route title with the app-owned head provider", () => {
    renderToString(() => <MetaProvider><AppShell label="Content" documentTitle={'Route <one> & "two"'}>Content</AppShell></MetaProvider>);
    const assets = getAssets();
    expect(assets).toContain("<title");
    expect(assets).toContain('Route &lt;one> &amp; "two"');
    expect(assets.match(/<title/g)).toHaveLength(1);
  });
});
