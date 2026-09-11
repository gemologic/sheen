import { Badge, Button, Link, Popover, useTheme } from "@gemologic/sheen";
import type { Accessor } from "solid-js";
import { For, Show, createMemo, createSignal, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { AdminChromeTarget, AdminNotificationModel } from "./admin-config.ts";

export interface NotificationCenterProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly notifications: AdminNotificationModel;
  readonly target?: Extract<AdminChromeTarget, "topbar-end" | "sidebar-footer">;
}

export function NotificationCenter(props: NotificationCenterProps): JSX.Element {
  const theme = useTheme();
  const [local, rest] = splitProps(props, ["notifications", "target", "class", "ref"]);
  const [open, setOpen] = createSignal(false);
  const items = createMemo(() => {
    const result = new Map<string, AdminNotificationModel["items"][number]>();
    for (const item of local.notifications.items) {
      if (!item.id.trim() || !item.title.trim()) throw new Error("NotificationCenter requires nonempty item IDs and titles");
      if (result.has(item.id)) throw new Error(`NotificationCenter has duplicate item ID ${JSON.stringify(item.id)}`);
      if (item.kind === "link" && !item.href.trim()) throw new Error(`NotificationCenter item ${JSON.stringify(item.id)} requires a destination`);
      result.set(item.id, item);
    }
    return result;
  });
  const ids = createMemo(() => [...items().keys()]);
  const unread = createMemo(() => [...items().values()].filter(item => !item.read).length);
  const label = createMemo(() => local.notifications.label?.trim() || theme.messages().notifications);
  return <div {...rest} ref={local.ref} class={`sheen-admin-notifications ${local.class ?? ""}`} data-admin-notification-target={local.target ?? "topbar-end"}>
    <Popover title={label()} placement={local.target === "sidebar-footer" ? "top-end" : "bottom-end"} open={open()} onOpenChange={setOpen}
      class="sheen-admin-notification-popover" trigger={<span class="sheen-admin-notification-trigger"><span aria-hidden="true">●</span><span>{label()}</span><Show when={unread()}>{count => <Badge tone="accent">{count()}</Badge>}</Show></span>}>
      <Show when={ids().length > 0} fallback={<p class="sheen-admin-notification-empty">{local.notifications.emptyLabel ?? theme.messages().noNotifications}</p>}>
        <ul class="sheen-admin-notification-list"><For each={ids()}>{id => <NotificationItem item={() => items().get(id)} close={() => setOpen(false)} />}</For></ul>
        <Show when={local.notifications.onMarkAllRead && unread() > 0}><Button class="sheen-admin-notification-read" onClick={() => local.notifications.onMarkAllRead?.()}>{theme.messages().markAllNotificationsRead}</Button></Show>
      </Show>
    </Popover>
  </div>;
}

function NotificationItem(props: { readonly item: Accessor<AdminNotificationModel["items"][number] | undefined>; readonly close: () => void }): JSX.Element {
  const isLink = () => props.item()?.kind === "link";
  const href = () => { const item = props.item(); return item?.kind === "link" ? item.href : ""; };
  const activate = (): void => { const item = props.item(); if (item?.kind === "action") item.onSelect(); props.close(); };
  return <Show when={props.item()}>{item => <li data-read={item().read || undefined} data-notification-id={item().id}>
    <Show when={isLink()} fallback={<Button class="sheen-admin-notification-item" onClick={activate}><NotificationCopy item={item} /></Button>}>
      <Link class="sheen-admin-notification-item" href={href()} onClick={props.close}><NotificationCopy item={item} /></Link>
    </Show>
  </li>}</Show>;
}

function NotificationCopy(props: { readonly item: Accessor<AdminNotificationModel["items"][number]> }): JSX.Element {
  const theme = useTheme();
  return <><span class="sheen-admin-notification-title">{props.item().title}<Show when={!props.item().read}><Badge tone="accent">{theme.messages().unread}</Badge></Show></span><Show when={props.item().description}><span>{props.item().description}</span></Show><Show when={props.item().timeLabel}><small>{props.item().timeLabel}</small></Show></>;
}
