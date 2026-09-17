import type { JSX } from "solid-js";
import type { MenuItem } from "@gemologic/sheen";

export type AdminPreset = "standard" | "workspace" | "horizontal" | "inspector";

export type AdminChromeAppearance = "layered" | "unified" | "tonal";
export type AdminNavigationAppearance = "subtle" | "accent" | "indicator";
export type AdminActionAppearance = "quiet" | "outlined" | "accent";

export interface AdminAppearance {
  /** Relationship among the topbar, sidebar, content, and details surfaces. */
  readonly chrome?: AdminChromeAppearance;
  /** Selected-route treatment, independent of the selected accent color. */
  readonly navigation?: AdminNavigationAppearance;
  /** Chrome action treatment. Primary actions gain emphasis only in accent mode. */
  readonly actions?: AdminActionAppearance;
}

export interface AdminResolvedAppearance {
  readonly chrome: AdminChromeAppearance;
  readonly navigation: AdminNavigationAppearance;
  readonly actions: AdminActionAppearance;
}

const chromeAppearances: readonly AdminChromeAppearance[] = ["layered", "unified", "tonal"];
const navigationAppearances: readonly AdminNavigationAppearance[] = ["subtle", "accent", "indicator"];
const actionAppearances: readonly AdminActionAppearance[] = ["quiet", "outlined", "accent"];

export function resolveAdminAppearance(appearance: AdminAppearance = {}): AdminResolvedAppearance {
  const chrome = appearance.chrome ?? "layered";
  const navigation = appearance.navigation ?? "subtle";
  const actions = appearance.actions ?? "quiet";
  if (!chromeAppearances.includes(chrome)) throw new Error(`AdminApp: unsupported chrome appearance ${JSON.stringify(chrome)}`);
  if (!navigationAppearances.includes(navigation)) throw new Error(`AdminApp: unsupported navigation appearance ${JSON.stringify(navigation)}`);
  if (!actionAppearances.includes(actions)) throw new Error(`AdminApp: unsupported action appearance ${JSON.stringify(actions)}`);
  return Object.freeze({ chrome, navigation, actions });
}

export type AdminChromeZone =
  | "product"
  | "workspace"
  | "primary-navigation"
  | "secondary-navigation"
  | "current-view"
  | "command-trigger"
  | "global-search"
  | "primary-actions"
  | "utility-actions"
  | "notifications"
  | "help"
  | "account";

export type AdminChromeTarget =
  | "topbar-start"
  | "topbar-center"
  | "topbar-end"
  | "sidebar-header"
  | "sidebar-navigation"
  | "sidebar-footer";

export interface AdminPlacementOverride {
  readonly zone: AdminChromeZone;
  readonly target: AdminChromeTarget;
}

export type AdminResolvedPlacements = Readonly<Record<AdminChromeZone, AdminChromeTarget>>;

export interface AdminNavigationLink {
  readonly kind: "link";
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly match?: "exact" | "prefix";
  readonly icon?: JSX.Element;
  readonly badge?: JSX.Element;
  /** Optional row action menu rendered beside, never inside, the navigation link. */
  readonly actions?: AdminNavigationActions;
}

export interface AdminNavigationActions {
  readonly label: string;
  readonly items: readonly MenuItem[];
}

export interface AdminNavigationGroup {
  readonly kind: "group";
  readonly id: string;
  readonly label: string;
  readonly items: readonly AdminNavigationEntry[];
}

export type AdminNavigationEntry = AdminNavigationLink | AdminNavigationGroup;

export interface AdminNavigationModel {
  readonly id: string;
  readonly label: string;
  readonly items: readonly AdminNavigationEntry[];
}

export interface AdminProductModel {
  readonly name: string;
  readonly href?: string;
  readonly mark?: JSX.Element;
}

export interface AdminAccountModel {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly avatarSrc?: string;
  readonly avatarFallback?: string;
  readonly menuLabel?: string;
  readonly items: readonly MenuItem[];
}

export interface AdminWorkspaceItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export interface AdminWorkspaceModel {
  readonly label: string;
  readonly currentId: string;
  readonly items: readonly AdminWorkspaceItem[];
  readonly onChange: (id: string) => void;
}

export type AdminActionRole = "primary" | "utility" | "help";

interface AdminActionBase {
  readonly id: string;
  readonly label: string;
  readonly icon?: JSX.Element | (() => JSX.Element);
}

export interface AdminButtonAction extends AdminActionBase {
  readonly kind: "action";
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

export interface AdminLinkAction extends AdminActionBase {
  readonly kind: "link";
  readonly href: string;
}

export type AdminAction = AdminButtonAction | AdminLinkAction;

export interface AdminActionGroup {
  readonly id: string;
  readonly label: string;
  readonly role: AdminActionRole;
  readonly items: readonly AdminAction[];
  readonly presentation?: "inline" | "overflow";
}

interface AdminNotificationBase {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly timeLabel?: string;
  readonly read?: boolean;
}

export interface AdminNotificationLink extends AdminNotificationBase {
  readonly kind: "link";
  readonly href: string;
}

export interface AdminNotificationAction extends AdminNotificationBase {
  readonly kind: "action";
  readonly onSelect: () => void;
}

export type AdminNotification = AdminNotificationLink | AdminNotificationAction;

export interface AdminNotificationModel {
  readonly label?: string;
  readonly emptyLabel?: string;
  readonly items: readonly AdminNotification[];
  readonly onMarkAllRead?: () => void;
}

export const adminChromeZones: readonly AdminChromeZone[] = [
  "product", "workspace", "primary-navigation", "secondary-navigation", "current-view", "command-trigger",
  "global-search", "primary-actions", "utility-actions", "notifications", "help", "account",
];

export const adminChromeTargets: readonly AdminChromeTarget[] = [
  "topbar-start", "topbar-center", "topbar-end", "sidebar-header", "sidebar-navigation", "sidebar-footer",
];

function placementTargets(...targets: AdminChromeTarget[]): readonly AdminChromeTarget[] {
  return Object.freeze(targets);
}

export const adminPlacementTargets: Readonly<Record<AdminChromeZone, readonly AdminChromeTarget[]>> = Object.freeze({
  product: placementTargets("topbar-start", "sidebar-header"),
  workspace: placementTargets("topbar-start", "topbar-end", "sidebar-header", "sidebar-footer"),
  "primary-navigation": placementTargets("topbar-center", "sidebar-navigation"),
  "secondary-navigation": placementTargets("topbar-center", "sidebar-navigation"),
  "current-view": placementTargets("topbar-start", "topbar-center", "sidebar-header"),
  "command-trigger": placementTargets("topbar-center", "topbar-end", "sidebar-footer"),
  "global-search": placementTargets("topbar-center", "topbar-end", "sidebar-header"),
  "primary-actions": placementTargets("topbar-end", "sidebar-footer"),
  "utility-actions": placementTargets("topbar-end", "sidebar-footer"),
  notifications: placementTargets("topbar-end", "sidebar-footer"),
  help: placementTargets("topbar-end", "sidebar-footer"),
  account: placementTargets("topbar-end", "sidebar-header", "sidebar-footer"),
});

const standard = {
  product: "sidebar-header",
  workspace: "sidebar-header",
  "primary-navigation": "sidebar-navigation",
  "secondary-navigation": "sidebar-navigation",
  "current-view": "topbar-start",
  "command-trigger": "topbar-center",
  "global-search": "topbar-center",
  "primary-actions": "topbar-end",
  "utility-actions": "topbar-end",
  notifications: "topbar-end",
  help: "topbar-end",
  account: "sidebar-footer",
} satisfies Record<AdminChromeZone, AdminChromeTarget>;

const workspace = {
  ...standard,
  product: "topbar-start",
  workspace: "sidebar-header",
  account: "sidebar-footer",
} satisfies Record<AdminChromeZone, AdminChromeTarget>;

const horizontal = {
  ...standard,
  product: "topbar-start",
  workspace: "topbar-start",
  "primary-navigation": "topbar-center",
  "secondary-navigation": "topbar-center",
  account: "topbar-end",
} satisfies Record<AdminChromeZone, AdminChromeTarget>;

const inspector = {
  ...standard,
} satisfies Record<AdminChromeZone, AdminChromeTarget>;

function presetPlacements(preset: AdminPreset): Record<AdminChromeZone, AdminChromeTarget> {
  switch (preset) {
    case "standard": return { ...standard };
    case "workspace": return { ...workspace };
    case "horizontal": return { ...horizontal };
    case "inspector": return { ...inspector };
    default: throw new Error(`AdminApp: unsupported preset ${JSON.stringify(preset)}`);
  }
}

export function resolveAdminPlacements(preset: AdminPreset = "standard", overrides: readonly AdminPlacementOverride[] = []): AdminResolvedPlacements {
  const result = presetPlacements(preset);
  const seen = new Set<AdminChromeZone>();
  for (const override of overrides) {
    if (seen.has(override.zone)) throw new Error(`AdminApp: duplicate placement override for ${JSON.stringify(override.zone)}`);
    seen.add(override.zone);
    if (!adminChromeZones.includes(override.zone)) throw new Error(`AdminApp: unsupported chrome zone ${JSON.stringify(override.zone)}`);
    if (!adminChromeTargets.includes(override.target)) throw new Error(`AdminApp: unsupported chrome target ${JSON.stringify(override.target)}`);
    const targets = adminPlacementTargets[override.zone];
    if (!targets.includes(override.target)) {
      throw new Error(`AdminApp: ${JSON.stringify(override.zone)} cannot be placed in ${JSON.stringify(override.target)}; supported targets are ${targets.join(", ")}`);
    }
    result[override.zone] = override.target;
  }
  return Object.freeze(result);
}

function normalizedPath(value: string): string {
  return value.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
}

export interface AdminActiveNavigation {
  readonly id: string;
  readonly href: string;
  readonly ancestors: readonly string[];
}

/** Validate the app-owned model and resolve one most-specific local route. */
export function resolveAdminNavigation(model: AdminNavigationModel, pathname: string): AdminActiveNavigation | undefined {
  if (!model.id.trim() || !model.label.trim()) throw new Error("Admin navigation requires nonempty model IDs and labels");
  const ids = new Set<string>();
  let active: AdminActiveNavigation | undefined;
  const path = normalizedPath(pathname);
  const visit = (items: readonly AdminNavigationEntry[], ancestors: readonly string[]): void => {
    for (const item of items) {
      if (!item.id.trim() || !item.label.trim()) throw new Error("Admin navigation requires nonempty item IDs and labels");
      if (ids.has(item.id)) throw new Error(`Admin navigation has duplicate item ID ${JSON.stringify(item.id)}`);
      ids.add(item.id);
      if (item.kind === "group") {
        visit(item.items, [...ancestors, item.id]);
        continue;
      }
      if (!item.href.trim()) throw new Error(`Admin navigation item ${JSON.stringify(item.id)} requires a destination`);
      if (item.actions !== undefined && (!item.actions.label.trim() || item.actions.items.length === 0)) {
        throw new Error(`Admin navigation item ${JSON.stringify(item.id)} requires a named, nonempty action menu`);
      }
      if (!item.href.startsWith("/") || item.href.startsWith("//")) continue;
      const target = normalizedPath(item.href);
      const matches = path === target || (item.match === "prefix" && target !== "/" && path.startsWith(`${target}/`));
      if (matches && (!active || target.length > active.href.length)) active = { id: item.id, href: target, ancestors };
    }
  };
  visit(model.items, []);
  return active;
}

export function adminNavigationLinks(model: AdminNavigationModel): readonly AdminNavigationLink[] {
  resolveAdminNavigation(model, "/__sheen_validation__");
  const result: AdminNavigationLink[] = [];
  const visit = (items: readonly AdminNavigationEntry[]): void => {
    for (const item of items) {
      if (item.kind === "link") result.push(item);
      else visit(item.items);
    }
  };
  visit(model.items);
  return result;
}
