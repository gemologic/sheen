import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { AdminApp } from "./AdminApp.tsx";
import { SettingsLayout } from "./SettingsLayout.tsx";
import type { AdminAccountModel, AdminNavigationModel, AdminProductModel, AdminWorkspaceModel } from "./admin-config.ts";

const product: AdminProductModel = { name: "Northstar", href: "/" };
const primary: AdminNavigationModel = { id: "primary", label: "Primary navigation", items: [
  { kind: "link", id: "overview", label: "Overview", href: "/" },
  { kind: "link", id: "orders", label: "Orders", href: "/orders", match: "prefix" },
] };
const account: AdminAccountModel = { id: "ada", name: "Ada Lovelace", email: "ada@example.test", items: [{ kind: "action", id: "sign-out", label: "Sign out", onSelect: () => {} }] };
const workspace: AdminWorkspaceModel = { label: "Workspace", currentId: "alpha", items: [{ id: "alpha", label: "Alpha" }, { id: "beta", label: "Beta" }], onChange: () => {} };

function render(preset: "standard" | "workspace" | "horizontal" | "inspector", overrides: Partial<Parameters<typeof AdminApp>[0]> = {}): string {
  return renderToString(() => <ThemeProvider><AdminApp label="Operations" pathname="/orders" preset={preset} product={product} primaryNavigation={primary}
    account={account} workspace={workspace} {...overrides}><input value="Retained draft" /></AdminApp></ThemeProvider>);
}

describe("AdminApp SSR", () => {
  it("provides AppShell dirty-state ownership before evaluating settings children", () => {
    const html = renderToString(() => <ThemeProvider><AdminApp label="Operations" pathname="/settings"><SettingsLayout label="Preferences" dirty={false} onSave={() => {}} sections={[{ id: "profile", label: "Profile", content: <input aria-label="Name" value="Ada" /> }]} /></AdminApp></ThemeProvider>);
    expect(html).toContain('aria-label="Preferences"');
    expect(html).toContain('aria-label="Name"');
    expect(html).toContain("Save changes");
  });
  it("renders an accessible overflow trigger without exposing closed controls", () => {
    const html = render("standard", { actionGroups: [{ id: "help", label: "More", role: "help", presentation: "overflow", items: [{ id: "docs", kind: "link", label: "Read documentation", href: "/docs" }] }] });
    expect(html).toContain("More");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Read documentation");
  });
  it("renders each preset from one deterministic semantic owner", () => {
    const standard = render("standard");
    expect(standard).toContain('data-sheen-density="comfortable"');
    expect(standard).toContain('data-admin-preset="standard"');
    expect(standard).toContain("Retained draft");
    expect(standard.match(/data-admin-zone="account"/g)).toHaveLength(1);
    expect(standard).toContain('data-admin-account-target="sidebar-footer"');
    expect(standard.match(/aria-label="Primary navigation"/g)).toHaveLength(1);
    expect(standard).toContain("sheen-shell-sidebar");

    const horizontal = render("horizontal");
    expect(horizontal).not.toContain("sheen-shell-sidebar");
    expect(horizontal).toContain("sheen-admin-top-nav");
    expect(horizontal.match(/aria-current="page"/g)).toHaveLength(1);

    expect(render("workspace")).toContain('data-admin-account-target="sidebar-footer"');
    expect(render("inspector")).toContain('data-admin-account-target="sidebar-footer"');
  });

  it("applies individual placement overrides and emits no closed overlay content", () => {
    const html = render("standard", { placements: [
      { zone: "product", target: "topbar-start" },
      { zone: "workspace", target: "sidebar-footer" },
      { zone: "account", target: "sidebar-header" },
    ], commandPalette: { sources: [{ kind: "static", id: "commands", commands: [{ id: "new", label: "New record", group: "Create", run: () => {} }] }] } });
    expect(html).toContain('data-admin-account-target="sidebar-header"');
    expect(html).toContain('data-admin-workspace-target="sidebar-footer"');
    expect(html).toContain("Command");
    expect(html).not.toContain('role="dialog"');
    expect(html.match(/Northstar/g)).toHaveLength(1);
  });

  it("emits independent chrome, navigation, and action brand axes", () => {
    const html = render("standard", { appearance: { chrome: "tonal", navigation: "indicator", actions: "accent" }, actionGroups: [
      { id: "create", label: "Create", role: "primary", items: [{ kind: "action", id: "new-order", label: "New order", onSelect: () => {} }] },
    ] });
    expect(html).toContain('data-admin-chrome="tonal"');
    expect(html).toContain('data-admin-navigation="indicator"');
    expect(html).toContain('data-admin-actions="accent"');
    expect(html).toContain("sheen-button-solid");
    expect(html).toContain("sheen-button-accent");
  });

  it("uses the server-resolved collapse preference without removing icon-rail content", () => {
    const html = render("standard", { sidebarPersistence: { initialCollapsed: true, save: () => {}, onError: () => {} } });
    expect(html).toContain('data-sidebar-collapsed="true"');
    expect(html).toContain('data-collapsed="true"');
    expect(html).toContain("Overview");
    expect(html).not.toMatch(/<aside[^>]*hidden/);

    const controlled = render("standard", { sidebarCollapsed: true, defaultSidebarCollapsed: false });
    expect(controlled).toContain('data-sidebar-collapsed="true"');
    const controlledOpen = render("standard", { sidebarCollapsed: false, sidebarPersistence: { initialCollapsed: true, save: () => {}, onError: () => {} } });
    expect(controlledOpen).not.toContain("data-sidebar-collapsed");
  });

  it("renders one details content owner and retains accepted page content while refreshing", () => {
    const html = render("inspector", { refreshing: true, details: { id: "order-42", title: "Order 42", content: <input value="Detail draft" />, open: true, resizable: true, onOpenChange: () => {} } });
    expect(html.match(/Detail draft/g)).toHaveLength(1);
    expect(html).toContain('role="complementary"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Retained draft");
    expect(html).toContain('aria-label="Resize details panel"');
  });

  it("clears omitted account and details content at an authorization boundary", () => {
    const html = renderToString(() => <ThemeProvider><AdminApp label="Operations" pathname="/orders" preset="standard" authorizationKey="viewer"
      product={product} primaryNavigation={primary} workspace={workspace}><input value="Authorized viewer content" /></AdminApp></ThemeProvider>);
    expect(html).toContain('data-authorization-key="viewer"');
    expect(html).not.toContain("Ada Lovelace");
    expect(html).not.toContain("sheen-admin-details");
  });
});
