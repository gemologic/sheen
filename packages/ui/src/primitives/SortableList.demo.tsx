import { createSignal } from "solid-js";
import { SortableList } from "./SortableList.tsx";
import type { SortableListProps } from "./SortableList.tsx";
import type { SortableItem } from "./sortable-core.ts";
import metadata from "./SortableList.meta.ts";

export const controls = metadata.props;
export default function SortableListDemo(props: Partial<Omit<SortableListProps<SortableItem>, "items" | "children">>) {
  const [items, setItems] = createSignal<readonly SortableItem[]>([{ id: "draft", label: "Draft release notes" }, { id: "keys", label: "Rotate API keys" }, { id: "locked", label: "Pinned incident review", disabled: true }, { id: "status", label: "Update status page" }]);
  return <SortableList label="Release tasks" {...props} items={items()} onReorder={event => { setItems(current => event.ids.flatMap(id => current.filter(item => item.id === id))); props.onReorder?.(event); }}>
    {item => <span>{item().label}</span>}
  </SortableList>;
}
