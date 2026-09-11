import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { Toast } from "./Toast.tsx";
import type { ToastController, ToastId, ToastNotification } from "./create-toaster.ts";
import { toasterPresenter } from "./create-toaster.ts";

export interface ToasterProps {
  controller: ToastController;
  limit?: number;
  label?: string;
  class?: string;
}
interface Lifetime {
  options: ToastNotification["options"];
  remaining: number;
}
interface Presentation {
  readonly notification: ToastNotification;
  readonly lifetime: Lifetime;
  readonly open: boolean;
  readonly opener: HTMLElement | undefined;
}

function Entry(props: { entry: Presentation; controller: ToastController; paused: boolean; onExit: () => void; fallback: () => void }): JSX.Element {
  let element: HTMLLIElement | undefined;
  const lifetime = props.entry.lifetime;
  const restoreFocus = () => {
    if (element?.contains(element.ownerDocument.activeElement)) {
      const opener = props.entry.opener;
      if (opener?.isConnected && !opener.closest("[inert]")) {
        opener.focus({ preventScroll: true });
        if (opener.ownerDocument.activeElement === opener) return;
      }
      props.fallback();
    }
  };
  const dismiss = () => {
    restoreFocus();
    props.controller.dismiss(props.entry.notification.id);
  };
  const runAction = () => {
    // The action becomes disabled while pending. Keep focus on a usable
    // control before that native disabled transition can blur it.
    if (element?.contains(element.ownerDocument.activeElement)) {
      element.querySelector<HTMLButtonElement>(".sheen-toast-close")?.focus({ preventScroll: true });
    }
    void props.controller.runAction(props.entry.notification.id);
  };
  createEffect(() => {
    const next = props.entry.notification.options;
    if (next !== lifetime.options) { lifetime.options = next; lifetime.remaining = next.duration ?? 0; }
    if (!props.entry.open || props.paused || props.entry.notification.state !== "idle" || lifetime.options.duration === null) return;
    const start = performance.now();
    const timer = window.setTimeout(dismiss, lifetime.remaining);
    onCleanup(() => { window.clearTimeout(timer); lifetime.remaining = Math.max(0, lifetime.remaining - (performance.now() - start)); });
  });
  createEffect(() => {
    if (props.entry.open || !element) return;
    restoreFocus();
    let canceled = false;
    const animations = element.getAnimations();
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (!canceled && !props.entry.open) props.onExit();
    });
    onCleanup(() => { canceled = true; });
  });
  return <li ref={element} class="sheen-toast-entry" data-open={props.entry.open} aria-hidden={!props.entry.open || undefined} inert={!props.entry.open}
    onAnimationEnd={event => { if (event.target === event.currentTarget && !props.entry.open) props.onExit(); }}
    onKeyDown={event => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); dismiss(); } }}>
    <Toast notification={props.entry.notification} onDismiss={dismiss} onAction={runAction} />
  </li>;
}

export function Toaster(props: ToasterProps): JSX.Element {
  const theme = useTheme();
  createMemo(() => { onCleanup(props.controller[toasterPresenter]()); return props.controller; });
  const [region, setRegion] = createSignal<HTMLDivElement>();
  const [presentations, setPresentations] = createSignal<readonly Presentation[]>([]);
  const [hovered, setHovered] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const [idle, setIdle] = createSignal(false);
  const [polite, setPolite] = createSignal("");
  const [assertive, setAssertive] = createSignal("");
  const announced = new Map<ToastId, string>();
  const lifetimes = new Map<ToastId, Lifetime>();
  const pendingAnnouncements = new Map<ToastId, { text: string; priority: "polite" | "assertive" }>();
  let announcementFrame: number | undefined;
  let disposed = false;
  const limit = createMemo(() => {
    const value = props.limit ?? 3;
    if (!Number.isSafeInteger(value) || value < 1) throw new Error("Toaster: limit must be a positive integer");
    return value;
  });
  createEffect(() => {
    const notifications = props.controller.notifications();
    const current = new Map(notifications.map(notification => [notification.id, notification]));
    for (const id of lifetimes.keys()) { if (!current.has(id)) lifetimes.delete(id); }
    const previous = presentations();
    const next = previous.map((entry, index) => {
      const notification = current.get(entry.notification.id);
      const open = notification !== undefined && index < limit();
      const retained = notification ?? entry.notification;
      return retained === entry.notification && open === entry.open ? entry : { ...entry, notification: retained, open };
    });
    for (const notification of notifications) {
      if (next.length >= limit()) break;
      if (next.some(entry => entry.notification.id === notification.id)) continue;
      const active = typeof document === "undefined" ? null : document.activeElement;
      const opener = typeof HTMLElement !== "undefined" && active instanceof HTMLElement ? active : undefined;
      const lifetime = lifetimes.get(notification.id) ?? { options: notification.options, remaining: notification.options.duration ?? 0 };
      lifetimes.set(notification.id, lifetime);
      next.push({ notification, lifetime, open: true, opener });
    }
    if (next.length !== previous.length || next.some((entry, index) => entry !== previous[index])) setPresentations(next);
  });
  createEffect(() => {
    if (!region()) return;
    const visibleIds = new Set(presentations().filter(entry => entry.open).map(entry => entry.notification.id));
    for (const id of announced.keys()) {
      if (!visibleIds.has(id)) { announced.delete(id); pendingAnnouncements.delete(id); setPolite(""); setAssertive(""); }
    }
    for (const entry of presentations()) {
      if (!entry.open) continue;
      const notification = entry.notification;
      const options = notification.options;
      const text = [options.title, options.description, notification.state === "pending" ? theme.messages().loading : notification.state === "failed" ? options.action?.errorMessage : options.action?.label].filter(Boolean).join(" ");
      const signature = JSON.stringify([text, options.priority]);
      if (announced.get(notification.id) === signature) continue;
      announced.set(notification.id, signature);
      pendingAnnouncements.set(notification.id, { text, priority: options.priority });
    }
    if (!pendingAnnouncements.size || announcementFrame !== undefined) return;
    setPolite(""); setAssertive("");
    announcementFrame = requestAnimationFrame(() => {
      announcementFrame = requestAnimationFrame(() => {
        announcementFrame = undefined;
        if (disposed) return;
        const visible = new Set(presentations().filter(entry => entry.open).map(entry => entry.notification.id));
        const messages = [...pendingAnnouncements].filter(([id]) => visible.has(id)).map(([, message]) => message);
        pendingAnnouncements.clear();
        setPolite(messages.filter(message => message.priority === "polite").map(message => message.text).join(" "));
        setAssertive(messages.filter(message => message.priority === "assertive").map(message => message.text).join(" "));
      });
    });
  });
  onMount(() => {
    const update = () => setIdle(document.hidden || !document.hasFocus());
    update();
    const blur = () => setIdle(true);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("blur", blur);
    onCleanup(() => { document.removeEventListener("visibilitychange", update); window.removeEventListener("focus", update); window.removeEventListener("blur", blur); });
  });
  onCleanup(() => { disposed = true; if (announcementFrame !== undefined) cancelAnimationFrame(announcementFrame); });
  const index = createMemo(() => new Map(presentations().map(entry => [entry.notification.id, entry])));
  const exit = (id: ToastId) => {
    announced.delete(id); pendingAnnouncements.delete(id);
    setPresentations(current => current.filter(entry => entry.notification.id !== id));
  };
  return <Show when={theme.portal()}>{target => <Portal mount={target()}>
    <div ref={setRegion} role="region" aria-label={props.label ?? theme.messages().notifications} tabindex="-1" class={cn("sheen-toaster", props.class)} data-kb-top-layer="true"
      style={{ "z-index": theme.layers.aboveAll() }} onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
      onFocusIn={() => setFocused(true)} onFocusOut={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div class="sheen-toast-announcer" role="status" aria-live="polite" aria-atomic="true">{polite()}</div>
      <div class="sheen-toast-announcer" role="alert" aria-atomic="true">{assertive()}</div>
      <ol class="sheen-toast-list"><For each={[...index().keys()]}>{id => <Show when={index().get(id)}>{entry =>
        <Entry entry={entry()} controller={props.controller} paused={hovered() || focused() || idle()} onExit={() => exit(id)} fallback={() => region()?.focus({ preventScroll: true })} />
      }</Show>}</For></ol>
    </div>
  </Portal>}</Show>;
}
