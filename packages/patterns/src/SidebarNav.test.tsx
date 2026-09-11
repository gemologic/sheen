import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { SidebarNav, resolveSidebarNavigation } from "./SidebarNav.tsx";
import type { SidebarNavSection } from "./SidebarNav.tsx";

const sections: readonly SidebarNavSection[] = [{ id: "work", label: "Workspace", items: [
  { kind: "link", id: "home", label: "Home", href: "/" },
  { kind: "link", id: "orders", label: "Orders", href: "/orders", match: "prefix" },
  { kind: "group", id: "reports", label: "Reports", items: [
    { kind: "link", id: "report", label: "Report", href: "/orders/reports/", match: "prefix" },
    { kind: "link", id: "external", label: "External", href: "https://example.com/orders/reports" },
  ] },
] }];

describe("SidebarNav", () => {
  it("selects the most specific segment match and ignores external destinations", () => {
    expect(resolveSidebarNavigation(sections, "/orders/reports/2026")?.id).toBe("report");
    expect(resolveSidebarNavigation(sections, "/orders/reports?sort=asc")?.ancestors).toEqual(["reports"]);
    expect(resolveSidebarNavigation(sections, "/orders-old")).toBeUndefined();
    expect(resolveSidebarNavigation(sections, "/")?.id).toBe("home");
  });
  it("rejects duplicate identities and malformed navigation", () => {
    expect(() => resolveSidebarNavigation([...sections, ...sections], "/")).toThrow("Duplicate");
    expect(() => resolveSidebarNavigation([{ id: "x", label: " ", items: [] }], "/")).toThrow("nonempty");
    expect(() => resolveSidebarNavigation([{ id: "x", label: "Work", items: [{ kind: "link", id: "y", label: "Bad", href: " " }] }], "/")).toThrow("destination");
    expect(() => resolveSidebarNavigation([{ id: "x", label: "Work", items: [{ kind: "link", id: "y", label: "Bad", href: "/bad", actions: { label: " ", items: [] } }] }], "/")).toThrow("named, nonempty action menu");
  });
  it("keeps navigation and named row actions as sibling controls", () => {
    const actionSections: readonly SidebarNavSection[] = [{ id: "work", label: "Workspace", items: [{ kind: "link", id: "orders", label: "Orders", href: "/orders", actions: { label: "Order actions", items: [{ kind: "action", id: "refresh", label: "Refresh orders", onSelect: () => {} }] } }] }];
    const html = renderToString(() => <ThemeProvider><SidebarNav sections={actionSections} pathname="/orders" /></ThemeProvider>);
    expect(html).toContain('aria-label="Order actions"');
    const linkStart = html.indexOf('href="/orders"');
    const linkEnd = html.indexOf("</a>", linkStart);
    const actionStart = html.indexOf("<button", linkStart);
    expect(linkStart).toBeGreaterThan(-1);
    expect(linkEnd).toBeGreaterThan(linkStart);
    expect(actionStart).toBeGreaterThan(linkEnd);
  });
  it("server renders active ancestors open and one current native link", () => {
    const html = renderToString(() => <ThemeProvider><SidebarNav sections={sections} pathname="/orders/reports/2026" /></ThemeProvider>);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('href="/orders/reports/"');
    expect(html).not.toContain('role="menu"');
  });
});
