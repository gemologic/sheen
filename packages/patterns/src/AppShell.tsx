import { Dialog, ScrollArea, ShortcutPending, ShortcutSheet, Tooltip, useShortcut, useShortcutBindings, useTheme } from "@gemologic/sheen";
import { Title } from "@solidjs/meta";
import { Show, children, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { UnsavedChangesContext, createUnsavedChangesRegistry } from "./unsaved-changes.ts";
import type { UnsavedChangesRegistry } from "./unsaved-changes.ts";
import type { RouterAdapter } from "./router.ts";
import { ShellNavigationGuard } from "./ShellNavigationGuard.tsx";
import { PaneRestorationContext, createPaneRestoration } from "./pane-restoration.ts";
import { createSidebarScrollRetention } from "./sidebar-scroll.ts";

export interface AppShellProps extends JSX.HTMLAttributes<HTMLDivElement> {
  label: string;
  documentTitle?: string;
  header?: JSX.Element;
  sidebar?: JSX.Element;
  sidebarOpen?: boolean;
  defaultSidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  sidebarBehavior?: "hide" | "collapse";
  mobileSidebarOpen?: boolean;
  onMobileSidebarOpenChange?: (open: boolean) => void;
  statusBar?: JSX.Element;
  router?: RouterAdapter;
  contentReady?: boolean;
  shortcutHelp?: boolean;
}

export function AppShell(props: AppShellProps): JSX.Element {
  const unsaved = createUnsavedChangesRegistry();
  onMount(() => {
    createEffect(() => {
      if (!props.router) return;
      const previous = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      onCleanup(() => { window.history.scrollRestoration = previous; });
    });
    createEffect(() => {
      if (!unsaved.dirty()) return;
      const preventUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
      window.addEventListener("beforeunload", preventUnload);
      onCleanup(() => window.removeEventListener("beforeunload", preventUnload));
    });
  });
  const restoration = createPaneRestoration(() => props.router);
  const sidebarProjection = createSidebarScrollRetention(restoration.project);
  const [viewport, setViewport] = createSignal<HTMLDivElement>();
  const [phone, setPhone] = createSignal(false);
  let beforeLayoutChange: ((phone: boolean) => void) | undefined;
  let media: MediaQueryList | undefined;
  onMount(() => {
    media = window.matchMedia("(max-width: 767px)");
    const update = () => { const next = media?.matches ?? false; if (next !== phone()) beforeLayoutChange?.(next); setPhone(next); };
    update();
    media.addEventListener("change", update);
    onCleanup(() => media?.removeEventListener("change", update));
  });
  restoration.attach("main", () => {
    const pane = viewport();
    const isPhone = phone();
    if (!(media?.matches ?? isPhone)) return pane;
    const scrolling = pane?.ownerDocument.scrollingElement;
    return scrolling instanceof HTMLElement ? scrolling : undefined;
  }, { ready: () => props.contentReady ?? true });
  return <UnsavedChangesContext.Provider value={unsaved}><PaneRestorationContext.Provider value={restoration}>
    <ShellFrame {...props} sidebarProjection={sidebarProjection} phone={phone()} registerLayoutChange={callback => { beforeLayoutChange = callback; }} unsaved={unsaved} viewportRef={setViewport} />
  </PaneRestorationContext.Provider></UnsavedChangesContext.Provider>;
}

function ShellFrame(props: AppShellProps & { sidebarProjection: (element: HTMLElement) => void; phone: boolean; registerLayoutChange: (callback: ((phone: boolean) => void) | undefined) => void; unsaved: UnsavedChangesRegistry; viewportRef: (element: HTMLDivElement) => void }): JSX.Element {
  const [local, others] = splitProps(props, ["label", "documentTitle", "header", "sidebar", "sidebarOpen", "defaultSidebarOpen", "onSidebarOpenChange", "sidebarBehavior", "mobileSidebarOpen", "onMobileSidebarOpenChange", "statusBar", "children", "class", "router", "contentReady", "shortcutHelp", "unsaved", "viewportRef", "phone", "registerLayoutChange", "sidebarProjection"]);
  const header = children(() => local.header);
  const sidebar = children(() => local.sidebar);
  const retainSidebarScroll = (element: HTMLElement) => local.sidebarProjection(element);
  const status = children(() => local.statusBar);
  const sidebarId = createUniqueId();
  const mobileSidebarId = `${sidebarId}-mobile`;
  const [sidebarDraft, setSidebarDraft] = createSignal(local.defaultSidebarOpen ?? true);
  const [mobileDraft, setMobileDraft] = createSignal(false);
  const sidebarOpen = () => local.sidebarOpen ?? sidebarDraft();
  const sidebarVisible = () => local.sidebarBehavior === "collapse" || sidebarOpen();
  const mobileOpen = () => local.mobileSidebarOpen ?? mobileDraft();
  let sidebarElement: HTMLElement | undefined;
  let sidebarTrigger: HTMLButtonElement | undefined;
  let mobileTrigger: HTMLButtonElement | undefined;
  let content: HTMLDivElement | undefined;
  let sidebarHadFocus = false;
  const ownsSidebarFocus = (target: EventTarget | null) => target === sidebarTrigger || (target instanceof Node && (sidebarElement?.contains(target) ?? false));
  onMount(() => {
    const document = sidebarElement?.ownerDocument ?? content?.ownerDocument;
    const window = document?.defaultView;
    if (!document || !window) return;
    sidebarHadFocus = ownsSidebarFocus(document.activeElement);
    const focused = (event: FocusEvent) => { sidebarHadFocus = ownsSidebarFocus(event.target); };
    const pointed = (event: PointerEvent) => { if (!ownsSidebarFocus(event.target)) sidebarHadFocus = false; };
    const blurred = () => { sidebarHadFocus = false; };
    document.addEventListener("focusin", focused);
    document.addEventListener("pointerdown", pointed, true);
    window.addEventListener("blur", blurred);
    onCleanup(() => { document.removeEventListener("focusin", focused); document.removeEventListener("pointerdown", pointed, true); window.removeEventListener("blur", blurred); });
  });
  local.registerLayoutChange(next => {
    const document = sidebarElement?.ownerDocument;
    if (!next || !document?.hasFocus()) return;
    // CSS can blur hidden sidebar content before the media-query event is dispatched.
    if (ownsSidebarFocus(document.activeElement) || (sidebarHadFocus && document.activeElement === document.body)) mobileTrigger?.focus({ preventScroll: true });
  });
  onCleanup(() => local.registerLayoutChange(undefined));
  const toggleDesktop = () => {
    const next = !sidebarOpen();
    if (local.sidebarOpen === undefined) setSidebarDraft(next);
    local.onSidebarOpenChange?.(next);
  };
  const changeMobile = (next: boolean) => {
    if (local.mobileSidebarOpen === undefined) setMobileDraft(next);
    local.onMobileSidebarOpenChange?.(next);
  };
  const toggleSidebar = () => { if (local.phone) changeMobile(!mobileOpen()); else toggleDesktop(); };
  createEffect(() => { if (!local.phone) setMobileDraft(false); });
  createEffect(() => {
    if (!sidebarVisible() && sidebarElement?.contains(sidebarElement.ownerDocument.activeElement)) (sidebarTrigger ?? content)?.focus({ preventScroll: true });
  });
  const label = createMemo(() => {
    if (!local.label.trim()) throw new Error("AppShell requires a nonempty content label");
    return local.label;
  });
  return <><Show when={local.documentTitle}>{title => <Title>{title()}</Title>}</Show><div {...others} class={`sheen-app-shell ${local.class ?? ""}`} data-sidebar={Boolean(sidebar()) && sidebarVisible()} data-sidebar-collapsed={Boolean(sidebar()) && local.sidebarBehavior === "collapse" && !sidebarOpen() || undefined}>
    <Show when={header() || local.shortcutHelp || sidebar()}><header role="banner" class="sheen-shell-header" data-shortcut-help={local.shortcutHelp || undefined}>{header()}<div class="sheen-shell-shortcut-help">
      <Show when={local.shortcutHelp}><ShellShortcutHelp /></Show>
      <Show when={sidebar()}><SidebarControls desktopId={sidebarId} mobileId={mobileSidebarId} desktopOpen={sidebarOpen()} mobileOpen={mobileOpen()} toggleDesktop={toggleDesktop} toggleMobile={() => changeMobile(!mobileOpen())} toggle={toggleSidebar} shortcuts={local.shortcutHelp ?? false} desktopRef={element => { sidebarTrigger = element; }} mobileRef={element => { mobileTrigger = element; }} /></Show>
    </div></header></Show>
    <Show when={sidebar()}><Show when={local.phone} fallback={<aside aria-label={label()} ref={element => { sidebarElement = element; retainSidebarScroll(element); }} id={sidebarId} class="sheen-shell-sidebar" hidden={!sidebarVisible()} inert={!sidebarVisible()}>{sidebar()}</aside>}>
      <MobileSidebar id={mobileSidebarId} open={mobileOpen()} onOpenChange={changeMobile} returnFocus={() => local.phone ? mobileTrigger : sidebarTrigger} contentRef={retainSidebarScroll}>{sidebar()}</MobileSidebar>
    </Show></Show>
    <main class="sheen-shell-main"><ScrollArea ref={element => { content = element; local.viewportRef(element); }} label={label()} class="sheen-shell-content">{local.children}</ScrollArea></main>
    <Show when={status()}><footer role="contentinfo" class="sheen-shell-status">{status()}</footer></Show>
    <Show when={local.router}>{router => <ShellNavigationGuard router={router()} unsaved={local.unsaved} />}</Show>
  </div></>;
}

function ShellShortcutHelp(): JSX.Element {
  const theme = useTheme();
  const [open, setOpen] = createSignal(false);
  let origin: HTMLElement | undefined;
  const change = (next: boolean) => {
    if (next && !open()) origin = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    setOpen(next);
  };
  useShortcut({ keys: "?", scope: "global", get label() { return theme.messages().shortcutHelp; }, get group() { return theme.messages().shortcutGroup; }, run: () => change(true) });
  useShortcut({ keys: "mod+shift+d", scope: "global", developmentOnly: true, get label() { return theme.messages().cycleThemeMode; }, get group() { return theme.messages().shortcutGroup; },
    run: () => theme.setMode(theme.mode() === "dark" ? "light" : theme.mode() === "light" ? "system" : "dark") });
  return <><ShortcutPending />
    <ShortcutSheet title={theme.messages().shortcutHelp} trigger={theme.messages().shortcutHelp} open={open()} onOpenChange={change} returnFocus={() => origin} />
  </>;
}

function SidebarBinding(props: { toggle: () => void; hint: (value: string | undefined) => void }): JSX.Element {
  const theme = useTheme();
  const bindings = useShortcutBindings();
  useShortcut({ keys: "mod+/", scope: "global", get label() { return theme.messages().toggleSidebar; }, get group() { return theme.messages().shortcutGroup; }, run: () => props.toggle() });
  createEffect(() => props.hint(bindings().find(binding => binding.scope === "global" && binding.keys === "mod+/")?.displayKeys));
  onCleanup(() => props.hint(undefined));
  return null;
}

function SidebarControls(props: { desktopId: string; mobileId: string; desktopOpen: boolean; mobileOpen: boolean; toggleDesktop: () => void; toggleMobile: () => void; toggle: () => void; shortcuts: boolean; desktopRef: (element: HTMLButtonElement | undefined) => void; mobileRef: (element: HTMLButtonElement | undefined) => void }): JSX.Element {
  const theme = useTheme();
  const [shortcut, setShortcut] = createSignal<string>();
  const hint = createMemo(() => { const value = shortcut(); return value ? { shortcut: value } : {}; });
  onCleanup(() => { props.desktopRef(undefined); props.mobileRef(undefined); });
  return <><Show when={props.shortcuts}><SidebarBinding toggle={props.toggle} hint={setShortcut} /></Show>
    <Tooltip class="sheen-sidebar-toggle-desktop" ref={props.desktopRef} content={theme.messages().toggleSidebar} {...hint()} aria-controls={props.desktopId} aria-expanded={props.desktopOpen} onClick={props.toggleDesktop}>{theme.messages().toggleSidebar}</Tooltip>
    <Tooltip class="sheen-sidebar-toggle-mobile" ref={props.mobileRef} content={theme.messages().toggleSidebar} {...hint()} aria-controls={props.mobileOpen ? props.mobileId : undefined} aria-expanded={props.mobileOpen} onClick={props.toggleMobile}>{theme.messages().toggleSidebar}</Tooltip>
  </>;
}

function MobileSidebar(props: { id: string; open: boolean; onOpenChange: (open: boolean) => void; returnFocus: () => HTMLElement | undefined; contentRef: (element: HTMLElement) => void; children: JSX.Element }): JSX.Element {
  const theme = useTheme();
  return <Dialog contentId={props.id} title={theme.messages().sidebar} open={props.open} onOpenChange={props.onOpenChange} returnFocus={props.returnFocus} class="sheen-shell-drawer"><div ref={props.contentRef} class="sheen-shell-drawer-content">{props.children}</div></Dialog>;
}
