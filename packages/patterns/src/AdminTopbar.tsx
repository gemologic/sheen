import { children, createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";

export interface AdminTopbarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly label?: string;
  readonly start?: JSX.Element;
  readonly center?: JSX.Element;
  readonly end?: JSX.Element;
}

export function AdminTopbar(props: AdminTopbarProps): JSX.Element {
  const [local, rest] = splitProps(props, ["label", "start", "center", "end", "class", "ref"]);
  const start = children(() => local.start);
  const center = children(() => local.center);
  const end = children(() => local.end);
  const label = createMemo(() => {
    const value = local.label ?? "Application controls";
    if (!value.trim()) throw new Error("AdminTopbar requires a nonempty label");
    return value;
  });
  return <div {...rest} ref={local.ref} role="region" aria-label={label()} class={`sheen-admin-topbar ${local.class ?? ""}`}>
    <div class="sheen-admin-topbar-start" data-admin-target="topbar-start">{start()}</div>
    <div class="sheen-admin-topbar-center" data-admin-target="topbar-center">{center()}</div>
    <div class="sheen-admin-topbar-end" data-admin-target="topbar-end">{end()}</div>
  </div>;
}
