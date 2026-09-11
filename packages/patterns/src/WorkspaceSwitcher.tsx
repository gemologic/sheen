import { DropdownMenu } from "@gemologic/sheen";
import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { MenuItem } from "@gemologic/sheen";
import type { AdminChromeTarget, AdminWorkspaceModel } from "./admin-config.ts";

export interface WorkspaceSwitcherProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  readonly workspace: AdminWorkspaceModel;
  readonly target?: Extract<AdminChromeTarget, "topbar-start" | "topbar-end" | "sidebar-header" | "sidebar-footer">;
  readonly collapsed?: boolean;
}

function placement(target: WorkspaceSwitcherProps["target"]): "top-end" | "bottom-start" | "bottom-end" {
  if (target === "sidebar-footer") return "top-end";
  return target === "topbar-end" ? "bottom-end" : "bottom-start";
}

export function WorkspaceSwitcher(props: WorkspaceSwitcherProps): JSX.Element {
  const [local, rest] = splitProps(props, ["workspace", "target", "collapsed", "class", "ref"]);
  const model = createMemo(() => {
    if (!local.workspace.label.trim()) throw new Error("WorkspaceSwitcher requires a nonempty label");
    const ids = new Set<string>();
    for (const item of local.workspace.items) {
      if (!item.id.trim() || !item.label.trim()) throw new Error("WorkspaceSwitcher requires nonempty item IDs and labels");
      if (ids.has(item.id)) throw new Error(`WorkspaceSwitcher has duplicate item ID ${JSON.stringify(item.id)}`);
      ids.add(item.id);
    }
    if (!ids.has(local.workspace.currentId)) throw new Error("WorkspaceSwitcher currentId must identify an item");
    return local.workspace;
  });
  const current = createMemo(() => model().items.find(item => item.id === model().currentId));
  const items = createMemo<readonly MenuItem[]>(() => [{
    kind: "radio", id: "workspace", label: model().label, value: model().currentId,
    onValueChange: model().onChange,
    options: model().items.map(item => ({ id: item.id, label: item.label, ...(item.description === undefined ? {} : { description: item.description }), ...(item.disabled === undefined ? {} : { disabled: item.disabled }) })),
  }]);
  return <div {...rest} ref={local.ref} class={`sheen-admin-workspace ${local.class ?? ""}`} data-admin-workspace-target={local.target ?? "sidebar-header"} data-collapsed={local.collapsed || undefined}>
    <DropdownMenu placement={placement(local.target)} matchTriggerWidth={(local.target ?? "sidebar-header").startsWith("sidebar") && !local.collapsed} triggerLabel={`${model().label}: ${current()?.label ?? ""}`} class="sheen-admin-workspace-menu" items={items()} trigger={<>
      <span class="sheen-admin-workspace-mark" aria-hidden="true">{Array.from(current()?.label ?? "W")[0]}</span>
      <span class="sheen-admin-workspace-copy"><strong>{current()?.label}</strong><span>{model().label}</span></span>
      <span class="sheen-admin-menu-chevron" aria-hidden="true" />
    </>} />
  </div>;
}
