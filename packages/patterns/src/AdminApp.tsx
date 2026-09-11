import { Button, CommandPalette, Kbd, Link, ShortcutProvider, ThemeScope, Toaster, createConfirm, createToaster } from "@gemologic/sheen";
import { For, Show, children, createContext, createMemo, createSignal, onCleanup, onMount, useContext } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import type { CommandPaletteRecents, CommandPaletteSource, ConfirmController, ThemeOverrides, ToastController } from "@gemologic/sheen";
import { AppShell } from "./AppShell.tsx";
import type { RouterAdapter } from "./router.ts";
import { SidebarNav } from "./SidebarNav.tsx";
import type { SidebarNavSection } from "./SidebarNav.tsx";
import { AdminTopbar } from "./AdminTopbar.tsx";
import { TopNav } from "./TopNav.tsx";
import { AccountMenu } from "./AccountMenu.tsx";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher.tsx";
import { NotificationCenter } from "./NotificationCenter.tsx";
import { DetailsPanel } from "./DetailsPanel.tsx";
import { resolveAdminAppearance, resolveAdminPlacements } from "./admin-config.ts";
import type { AdminAccountModel, AdminAction, AdminActionAppearance, AdminActionGroup, AdminAppearance, AdminChromeTarget, AdminChromeZone, AdminNavigationModel, AdminNotificationModel, AdminPlacementOverride, AdminPreset, AdminProductModel, AdminWorkspaceModel } from "./admin-config.ts";

export interface AdminSidebarPersistence {
  readonly initialCollapsed: boolean;
  readonly save: (collapsed: boolean) => void | Promise<void>;
  readonly onError: (error: unknown) => void;
}

export interface AdminCommandPaletteModel {
  readonly label?: string;
  readonly sources: readonly CommandPaletteSource[];
  readonly recents?: CommandPaletteRecents;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onSourceError?: (sourceId: string, error: unknown) => void;
  readonly onCommandError?: (commandId: string, error: unknown) => void;
}

export interface AdminDetailsModel {
  readonly id: string;
  readonly title: string;
  readonly content: JSX.Element;
  readonly open?: boolean;
  readonly resizable?: boolean;
  readonly width?: number;
  readonly defaultWidth?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly onWidthChange?: (width: number) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly returnFocus?: () => HTMLElement | undefined;
}

export interface AdminAppProps {
  readonly label: string;
  readonly documentTitle?: string;
  readonly preset?: AdminPreset;
  readonly appearance?: AdminAppearance;
  readonly theme?: ThemeOverrides;
  readonly placements?: readonly AdminPlacementOverride[];
  readonly pathname: string;
  readonly router?: RouterAdapter;
  readonly product?: AdminProductModel | undefined;
  readonly workspace?: AdminWorkspaceModel | undefined;
  readonly primaryNavigation?: AdminNavigationModel | undefined;
  readonly secondaryNavigation?: AdminNavigationModel | undefined;
  readonly currentView?: JSX.Element | undefined;
  readonly globalSearch?: JSX.Element | undefined;
  readonly actionGroups?: readonly AdminActionGroup[] | undefined;
  readonly notifications?: AdminNotificationModel | undefined;
  readonly account?: AdminAccountModel | undefined;
  readonly commandPalette?: AdminCommandPaletteModel | undefined;
  readonly details?: AdminDetailsModel | undefined;
  readonly statusBar?: JSX.Element | undefined;
  readonly refreshing?: boolean;
  readonly contentReady?: boolean;
  readonly sidebarCollapsed?: boolean;
  readonly defaultSidebarCollapsed?: boolean;
  readonly onSidebarCollapsedChange?: (collapsed: boolean) => void;
  readonly sidebarPersistence?: AdminSidebarPersistence;
  readonly mobileSidebarOpen?: boolean;
  readonly onMobileSidebarOpenChange?: (open: boolean) => void;
  readonly shortcutHelp?: boolean;
  readonly development?: boolean;
  readonly authorizationKey?: string;
  readonly class?: string;
  readonly children: JSX.Element;
}

export interface AdminServices {
  readonly toasts: ToastController;
  readonly confirm: ConfirmController;
}

const AdminServicesContext = createContext<AdminServices>();

export function useAdminServices(): AdminServices {
  const services = useContext(AdminServicesContext);
  if (!services) throw new Error("useAdminServices requires an AdminApp owner");
  return services;
}

const targetOrder: Readonly<Record<AdminChromeTarget, readonly AdminChromeZone[]>> = {
  "topbar-start": ["product", "workspace", "current-view"],
  "topbar-center": ["primary-navigation", "secondary-navigation", "current-view", "global-search", "command-trigger"],
  "topbar-end": ["global-search", "primary-actions", "utility-actions", "notifications", "help", "workspace", "account", "command-trigger"],
  "sidebar-header": ["product", "workspace", "current-view", "global-search", "account"],
  "sidebar-navigation": ["primary-navigation", "secondary-navigation"],
  "sidebar-footer": ["command-trigger", "primary-actions", "utility-actions", "notifications", "help", "workspace", "account"],
};

function useNarrowDetails(): Accessor<boolean> {
  const [narrow, setNarrow] = createSignal(false);
  onMount(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    onCleanup(() => media.removeEventListener("change", update));
  });
  return narrow;
}

export function AdminApp(props: AdminAppProps): JSX.Element {
  const toasts = createToaster();
  const confirm = createConfirm();
  const services: AdminServices = Object.freeze({ toasts, confirm });
  const scopeTheme = createMemo<ThemeOverrides>(() => ({
    ...(props.theme ?? {}),
    ...(props.theme?.density === undefined ? { density: "comfortable" } : {}),
  }));
  return <ThemeScope {...scopeTheme()} class="sheen-admin-scope"><ShortcutProvider development={props.development ?? false}>
    <AdminServicesContext.Provider value={services}><AdminRuntime {...props} services={services} /></AdminServicesContext.Provider>
  </ShortcutProvider></ThemeScope>;
}

function AdminRuntime(props: AdminAppProps & { readonly services: AdminServices }): JSX.Element {
  const ConfirmDialog = props.services.confirm.Dialog;
  const placements = createMemo(() => resolveAdminPlacements(props.preset ?? "standard", props.placements));
  const appearance = createMemo(() => resolveAdminAppearance(props.appearance));
  const page = children(() => props.children);
  const currentView = children(() => props.currentView);
  const search = children(() => props.globalSearch);
  const status = children(() => props.statusBar);
  // JSX-bearing model objects must be read once. Inline object props are getters in
  // compiled Solid output, so repeated reads would manufacture unrendered hydration
  // nodes before the accepted instance is mounted.
  const product = createMemo(() => props.product);
  const workspace = createMemo(() => props.workspace);
  const primaryNavigation = createMemo(() => props.primaryNavigation);
  const secondaryNavigation = createMemo(() => props.secondaryNavigation);
  const notifications = createMemo(() => props.notifications);
  const account = createMemo(() => props.account);
  const commandPalette = createMemo(() => props.commandPalette);
  const details = createMemo(() => props.details);
  const initialCollapsed = props.defaultSidebarCollapsed ?? props.sidebarPersistence?.initialCollapsed ?? false;
  const [collapsedDraft, setCollapsedDraft] = createSignal(initialCollapsed);
  const collapsed = () => props.sidebarCollapsed ?? collapsedDraft();
  const [commandDraft, setCommandDraft] = createSignal(commandPalette()?.defaultOpen ?? false);
  const commandOpen = () => commandPalette()?.open ?? commandDraft();
  const narrowDetails = useNarrowDetails();
  const groups = createMemo(() => validateActionGroups(props.actionGroups ?? []));
  const sidebarSections = createMemo<readonly SidebarNavSection[]>(() => {
    const result: SidebarNavSection[] = [];
    const primary = primaryNavigation();
    if (primary && placements()["primary-navigation"] === "sidebar-navigation") {
      result.push({ id: primary.id, label: primary.label, items: primary.items });
    }
    const secondary = secondaryNavigation();
    if (secondary && placements()["secondary-navigation"] === "sidebar-navigation") {
      result.push({ id: secondary.id, label: secondary.label, items: secondary.items });
    }
    return result;
  });
  const available = (zone: AdminChromeZone): boolean => {
    switch (zone) {
      case "product": return product() !== undefined;
      case "workspace": return workspace() !== undefined;
      case "primary-navigation": return primaryNavigation() !== undefined;
      case "secondary-navigation": return secondaryNavigation() !== undefined;
      case "current-view": return Boolean(currentView());
      case "command-trigger": return commandPalette() !== undefined;
      case "global-search": return Boolean(search());
      case "primary-actions": return groups().some(group => group.role === "primary");
      case "utility-actions": return groups().some(group => group.role === "utility");
      case "notifications": return notifications() !== undefined;
      case "help": return groups().some(group => group.role === "help");
      case "account": return account() !== undefined;
    }
  };
  const zonesAt = (target: AdminChromeTarget): readonly AdminChromeZone[] => targetOrder[target].filter(zone => placements()[zone] === target && available(zone));
  const hasSidebar = () => zonesAt("sidebar-header").length > 0 || zonesAt("sidebar-navigation").length > 0 || zonesAt("sidebar-footer").length > 0;
  const persistCollapsed = (next: boolean): void => {
    if (props.sidebarCollapsed === undefined) setCollapsedDraft(next);
    props.onSidebarCollapsedChange?.(next);
    const persistence = props.sidebarPersistence;
    if (!persistence) return;
    try {
      const saved = persistence.save(next);
      if (saved instanceof Promise) void saved.catch(persistence.onError);
    } catch (error) { persistence.onError(error); }
  };
  const setCommandOpen = (next: boolean): void => {
    if (commandPalette()?.open === undefined) setCommandDraft(next);
    commandPalette()?.onOpenChange?.(next);
  };
  const renderZone = (zone: AdminChromeZone, target: AdminChromeTarget): JSX.Element => {
    switch (zone) {
      case "product": {
        const model = product();
        return model ? <AdminProduct product={model} collapsed={collapsed() && target === "sidebar-header"} /> : null;
      }
      case "workspace": {
        const model = workspace();
        return model ? <WorkspaceSwitcher workspace={model} target={workspaceTarget(target)} collapsed={collapsed() && target.startsWith("sidebar-")} /> : null;
      }
      case "primary-navigation": {
        const model = primaryNavigation();
        return model && target === "topbar-center" ? <TopNav navigation={model} pathname={props.pathname} /> : null;
      }
      case "secondary-navigation": {
        const model = secondaryNavigation();
        return model && target === "topbar-center" ? <TopNav navigation={model} pathname={props.pathname} /> : null;
      }
      case "current-view": return currentView();
      case "command-trigger": return commandPalette() ? <Button class="sheen-admin-command-trigger" onClick={() => setCommandOpen(true)}><span>{commandPalette()?.label ?? "Command"}</span><Kbd>⌘K</Kbd></Button> : null;
      case "global-search": return search();
      case "primary-actions": return <AdminActions groups={groups().filter(group => group.role === "primary")} appearance={appearance().actions} />;
      case "utility-actions": return <AdminActions groups={groups().filter(group => group.role === "utility")} appearance={appearance().actions} />;
      case "notifications": {
        const model = notifications();
        return model ? <NotificationCenter notifications={model} target={target === "sidebar-footer" ? "sidebar-footer" : "topbar-end"} /> : null;
      }
      case "help": return <AdminActions groups={groups().filter(group => group.role === "help")} appearance={appearance().actions} />;
      case "account": {
        const model = account();
        return model ? <AccountMenu account={model} target={accountTarget(target)} collapsed={collapsed() && target.startsWith("sidebar-")} /> : null;
      }
    }
  };
  const sidebarHeaderZones = () => zonesAt("sidebar-header");
  const sidebarFooterZones = () => zonesAt("sidebar-footer");
  const detailsOpen = () => details()?.open ?? Boolean(details());
  return <AppShell label={props.label} {...(props.documentTitle === undefined ? {} : { documentTitle: props.documentTitle })}
    {...(props.router === undefined ? {} : { router: props.router })} {...(props.contentReady === undefined ? {} : { contentReady: props.contentReady })}
    class={`sheen-admin-app ${props.class ?? ""}`} data-admin-preset={props.preset ?? "standard"} data-admin-chrome={appearance().chrome}
    data-admin-navigation={appearance().navigation} data-admin-actions={appearance().actions} data-authorization-key={props.authorizationKey}
    header={<AdminTopbar start={<AdminTarget target="topbar-start" zones={zonesAt("topbar-start")} render={renderZone} />}
      center={<AdminTarget target="topbar-center" zones={zonesAt("topbar-center")} render={renderZone} />}
      end={<AdminTarget target="topbar-end" zones={zonesAt("topbar-end")} render={renderZone} />} />}
    sidebar={hasSidebar() ? <SidebarNav sections={sidebarSections()} pathname={props.pathname} collapsed={collapsed()}
      header={sidebarHeaderZones().length > 0 ? <AdminTarget target="sidebar-header" zones={sidebarHeaderZones()} render={renderZone} /> : undefined}
      footer={sidebarFooterZones().length > 0 ? <AdminTarget target="sidebar-footer" zones={sidebarFooterZones()} render={renderZone} /> : undefined} /> : undefined}
    sidebarBehavior="collapse" sidebarOpen={!collapsed()} defaultSidebarOpen={!initialCollapsed}
    onSidebarOpenChange={open => persistCollapsed(!open)} {...(props.mobileSidebarOpen === undefined ? {} : { mobileSidebarOpen: props.mobileSidebarOpen })}
    {...(props.onMobileSidebarOpenChange === undefined ? {} : { onMobileSidebarOpenChange: props.onMobileSidebarOpenChange })}
    statusBar={status()} shortcutHelp={props.shortcutHelp ?? true}>
    <div class="sheen-admin-body" data-details={detailsOpen() || undefined} data-details-presentation={narrowDetails() ? "sheet" : "docked"}>
      <div class="sheen-admin-page" aria-busy={props.refreshing || undefined} data-pending={props.refreshing || undefined}
        inert={detailsOpen() && narrowDetails()}>{page()}</div>
      <Show when={details()}>{model => <DetailsPanel panelId={model().id} title={model().title} open={detailsOpen()} presentation={narrowDetails() ? "sheet" : "docked"}
        onOpenChange={model().onOpenChange} {...(model().returnFocus === undefined ? {} : { returnFocus: model().returnFocus })}
        {...(model().resizable === undefined ? {} : { resizable: model().resizable })} {...(model().width === undefined ? {} : { width: model().width })}
        {...(model().defaultWidth === undefined ? {} : { defaultWidth: model().defaultWidth })} {...(model().minWidth === undefined ? {} : { minWidth: model().minWidth })}
        {...(model().maxWidth === undefined ? {} : { maxWidth: model().maxWidth })} {...(model().onWidthChange === undefined ? {} : { onWidthChange: model().onWidthChange })}>{model().content}</DetailsPanel>}</Show>
    </div>
    <Show when={commandPalette()}>{model => <CommandPalette sources={model().sources} open={commandOpen()} onOpenChange={setCommandOpen}
      {...(model().recents === undefined ? {} : { recents: model().recents })} {...(model().onSourceError === undefined ? {} : { onSourceError: model().onSourceError })}
      {...(model().onCommandError === undefined ? {} : { onCommandError: model().onCommandError })} />}</Show>
    <Toaster controller={props.services.toasts} />
    <ConfirmDialog />
  </AppShell>;
}

function AdminTarget(props: { readonly target: AdminChromeTarget; readonly zones: readonly AdminChromeZone[]; readonly render: (zone: AdminChromeZone, target: AdminChromeTarget) => JSX.Element }): JSX.Element {
  return <For each={props.zones}>{zone => <div class="sheen-admin-zone" data-admin-zone={zone}>{props.render(zone, props.target)}</div>}</For>;
}

function AdminProduct(props: { readonly product: AdminProductModel; readonly collapsed: boolean }): JSX.Element {
  if (!props.product.name.trim()) throw new Error("AdminApp product name must be nonempty");
  const content = <><Show when={props.product.mark}><span class="sheen-admin-product-mark" aria-hidden="true">{props.product.mark}</span></Show><span class="sheen-admin-product-name">{props.product.name}</span></>;
  return <Show when={props.product.href} fallback={<div class="sheen-admin-product" data-collapsed={props.collapsed || undefined}>{content}</div>}>
    {href => <Link class="sheen-admin-product" href={href()} data-collapsed={props.collapsed || undefined}>{content}</Link>}
  </Show>;
}

function AdminActions(props: { readonly groups: readonly AdminActionGroup[]; readonly appearance: AdminActionAppearance }): JSX.Element {
  return <For each={props.groups}>{group => <div class="sheen-admin-actions" role="group" aria-label={group.label} data-action-role={group.role} data-action-appearance={props.appearance}>
    <For each={group.items}>{item => <AdminActionControl action={item} role={group.role} appearance={props.appearance} />}</For>
  </div>}</For>;
}

function AdminActionControl(props: { readonly action: AdminAction; readonly role: AdminActionGroup["role"]; readonly appearance: AdminActionAppearance }): JSX.Element {
  const icon = children(() => props.action.icon);
  const content = <><Show when={icon()}>{resolved => <span class="sheen-admin-action-icon" aria-hidden="true">{resolved()}</span>}</Show><span class="sheen-admin-action-label">{props.action.label}</span></>;
  return props.action.kind === "link" ? <Link variant="button" href={props.action.href}>{content}</Link>
    : <Button variant={props.appearance === "accent" && props.role === "primary" ? "solid" : props.appearance === "outlined" ? "outline" : props.appearance === "accent" ? "soft" : "ghost"}
      tone={props.appearance !== "quiet" && props.role === "primary" ? "accent" : "neutral"} disabled={props.action.disabled} onClick={props.action.onSelect}>{content}</Button>;
}

function validateActionGroups(groups: readonly AdminActionGroup[]): readonly AdminActionGroup[] {
  const groupIds = new Set<string>();
  const itemIds = new Set<string>();
  for (const group of groups) {
    if (!group.id.trim() || !group.label.trim()) throw new Error("AdminApp action groups require nonempty IDs and labels");
    if (groupIds.has(group.id)) throw new Error(`AdminApp has duplicate action-group ID ${JSON.stringify(group.id)}`);
    groupIds.add(group.id);
    for (const item of group.items) {
      if (!item.id.trim() || !item.label.trim()) throw new Error("AdminApp actions require nonempty IDs and labels");
      if (itemIds.has(item.id)) throw new Error(`AdminApp has duplicate action ID ${JSON.stringify(item.id)}`);
      itemIds.add(item.id);
      if (item.kind === "link" && !item.href.trim()) throw new Error(`AdminApp action ${JSON.stringify(item.id)} requires a destination`);
    }
  }
  return groups;
}

function accountTarget(target: AdminChromeTarget): AccountMenuPropsTarget {
  if (target === "sidebar-header" || target === "sidebar-footer") return target;
  return "topbar-end";
}
type AccountMenuPropsTarget = "topbar-end" | "sidebar-header" | "sidebar-footer";

function workspaceTarget(target: AdminChromeTarget): WorkspaceTarget {
  if (target === "topbar-start" || target === "topbar-end" || target === "sidebar-header" || target === "sidebar-footer") return target;
  throw new Error(`AdminApp workspace cannot render in ${JSON.stringify(target)}`);
}
type WorkspaceTarget = "topbar-start" | "topbar-end" | "sidebar-header" | "sidebar-footer";
