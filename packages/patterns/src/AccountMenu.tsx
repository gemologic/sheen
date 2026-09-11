import { Avatar, DropdownMenu } from "@gemologic/sheen";
import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { AdminAccountModel, AdminChromeTarget } from "./admin-config.ts";

export interface AccountMenuProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly account: AdminAccountModel;
  readonly target?: Extract<AdminChromeTarget, "topbar-end" | "sidebar-header" | "sidebar-footer">;
  readonly collapsed?: boolean;
}

function menuPlacement(target: AccountMenuProps["target"]): "top-end" | "bottom-end" {
  return target === "sidebar-footer" ? "top-end" : "bottom-end";
}

export function AccountMenu(props: AccountMenuProps): JSX.Element {
  const [local, rest] = splitProps(props, ["account", "target", "collapsed", "class", "ref"]);
  const account = createMemo(() => {
    if (!local.account.id.trim() || !local.account.name.trim()) throw new Error("AccountMenu requires nonempty account id and name");
    if (local.account.email !== undefined && !local.account.email.trim()) throw new Error("AccountMenu email must be nonempty when supplied");
    if (local.account.items.length === 0) throw new Error("AccountMenu requires at least one menu item");
    return local.account;
  });
  return <div {...rest} ref={local.ref} class={`sheen-admin-account ${local.class ?? ""}`} data-admin-account-target={local.target ?? "topbar-end"} data-collapsed={local.collapsed || undefined}>
    <DropdownMenu placement={menuPlacement(local.target)} matchTriggerWidth={local.target?.startsWith("sidebar") === true && !local.collapsed} triggerLabel={account().menuLabel ?? `Account: ${account().name}`} class="sheen-admin-account-menu" items={account().items} trigger={<>
      <Avatar label={account().name} {...(account().avatarSrc === undefined ? {} : { src: account().avatarSrc })} {...(account().avatarFallback === undefined ? {} : { fallback: account().avatarFallback })} size="sm" />
      <span class="sheen-admin-account-copy"><strong>{account().name}</strong><span>{account().email}</span></span>
      <span class="sheen-admin-menu-chevron" aria-hidden="true" />
    </>} />
  </div>;
}
