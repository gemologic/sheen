import { describe, expect, it } from "vitest";
import { adminChromeZones, adminNavigationLinks, adminPlacementTargets, resolveAdminAppearance, resolveAdminNavigation, resolveAdminPlacements } from "./admin-config.ts";
import type { AdminNavigationModel } from "./admin-config.ts";

const navigation: AdminNavigationModel = { id: "primary", label: "Primary", items: [
  { kind: "link", id: "home", label: "Home", href: "/" },
  { kind: "group", id: "operations", label: "Operations", items: [
    { kind: "link", id: "orders", label: "Orders", href: "/orders", match: "prefix" },
    { kind: "link", id: "reports", label: "Reports", href: "/orders/reports", match: "prefix" },
  ] },
] };

describe("AdminApp configuration", () => {
  it("resolves independent brand-safe appearance axes", () => {
    expect(resolveAdminAppearance()).toEqual({ chrome: "layered", navigation: "subtle", actions: "quiet" });
    expect(resolveAdminAppearance({ chrome: "tonal", navigation: "indicator", actions: "accent" })).toEqual({ chrome: "tonal", navigation: "indicator", actions: "accent" });
    // @ts-expect-error Runtime validation still protects untyped consumers.
    expect(() => resolveAdminAppearance({ chrome: "painted" })).toThrow("unsupported chrome appearance");
  });
  it("resolves complete deterministic presets and bounded overrides", () => {
    expect(resolveAdminPlacements("standard").account).toBe("sidebar-footer");
    expect(resolveAdminPlacements("workspace").account).toBe("sidebar-footer");
    expect(resolveAdminPlacements("horizontal")["primary-navigation"]).toBe("topbar-center");
    expect(resolveAdminPlacements("horizontal").account).toBe("topbar-end");
    expect(resolveAdminPlacements("inspector")["primary-navigation"]).toBe("sidebar-navigation");
    expect(resolveAdminPlacements("standard", [{ zone: "account", target: "sidebar-header" }]).account).toBe("sidebar-header");
    expect(Object.keys(resolveAdminPlacements())).toHaveLength(12);
    for (const zone of adminChromeZones) {
      for (const target of adminPlacementTargets[zone]) {
        expect(resolveAdminPlacements("standard", [{ zone, target }])[zone]).toBe(target);
      }
    }
  });

  it("rejects duplicate, unknown, and unsupported placement input descriptively", () => {
    expect(() => resolveAdminPlacements("standard", [{ zone: "account", target: "sidebar-footer" }, { zone: "account", target: "topbar-end" }])).toThrow("duplicate placement override");
    expect(() => resolveAdminPlacements("standard", [{ zone: "primary-navigation", target: "topbar-end" }])).toThrow("supported targets are topbar-center, sidebar-navigation");
    // @ts-expect-error Runtime validation still protects untyped consumers.
    expect(() => resolveAdminPlacements("missing")).toThrow("unsupported preset");
    // @ts-expect-error Runtime validation still protects untyped consumers.
    expect(() => resolveAdminPlacements("standard", [{ zone: "missing", target: "topbar-end" }])).toThrow("unsupported chrome zone");
    // @ts-expect-error Runtime validation still protects untyped consumers.
    expect(() => resolveAdminPlacements("standard", [{ zone: "account", target: "missing" }])).toThrow("unsupported chrome target");
  });

  it("validates navigation and picks the most-specific route without exposing an engine type", () => {
    expect(resolveAdminNavigation(navigation, "/orders/reports/weekly")?.id).toBe("reports");
    expect(resolveAdminNavigation(navigation, "/orders/42")?.ancestors).toEqual(["operations"]);
    expect(adminNavigationLinks(navigation).map(item => item.id)).toEqual(["home", "orders", "reports"]);
    expect(() => resolveAdminNavigation({ ...navigation, items: [...navigation.items, { kind: "link", id: "home", label: "Duplicate", href: "/duplicate" }] }, "/")).toThrow("duplicate item ID");
    expect(() => resolveAdminNavigation({ ...navigation, items: [{ kind: "link", id: "actions", label: "Actions", href: "/actions", actions: { label: " ", items: [] } }] }, "/")).toThrow("named, nonempty action menu");
  });
});
