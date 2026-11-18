import { defineMeta } from "../metadata.ts";
import type { SortableListProps } from "./SortableList.tsx";
import type { SortableItem } from "./sortable-core.ts";

export default defineMeta<SortableListProps<SortableItem>>({
  name: "SortableList", package: "@gemologic/sheen", category: "data", summary: "A controlled reorderable list with pointer dragging, an accent drop indicator, auto-scroll, and an announced keyboard model. Import it from @gemologic/sheen/sortable with @gemologic/sheen/styles/sortable.css.",
  props: {
    ref: { description: "Root element reference." },
    items: { description: "Owner-ordered items with stable, unique, nonempty ids and a label used for handles and announcements. Item nodes are keyed by id, so refreshed objects keep their DOM, focus, and any in-progress keyboard lift." },
    children: { description: "Renders one item from its accessor and current index. It runs once per id; read the accessor for refreshed data." },
    onReorder: { description: "Receives { id, fromIndex, toIndex, ids } after a pointer drop or keyboard drop. The list is controlled: pass reordered items back to accept the move." },
    label: { description: "Accessible name of the list.", control: { kind: "text" } },
    orientation: { description: "Layout and arrow-key axis. Horizontal arrows follow reading direction, so they mirror in RTL scopes.", default: "vertical", control: { kind: "select", values: ["vertical", "horizontal"] } },
    handle: { description: "Render a grip button on each item that owns pointer and keyboard dragging. Without it the whole item drags and is the keyboard target.", default: false, control: { kind: "boolean" } },
    disabled: { description: "Prevents picking up any item. Items with disabled: true cannot be picked up, but others still move around them.", default: false, control: { kind: "boolean" } },
    messages: { description: "Per-instance overrides for the sortable* message keys. Scoped ThemeProvider messages with the same keys apply first." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-elevation-raised", "--sheen-elevation-overlay", "--sheen-color-accent", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset", "--sheen-surface-radius"],
  a11y: {
    role: "list of list items; each item (or its grip button) is the keyboard drag target, described by visually hidden instructions, with an assertive status region for announcements",
    keyboard: ["Space or Enter picks up the focused item", "ArrowUp/ArrowDown (vertical) or ArrowLeft/ArrowRight (horizontal, mirrored in RTL) move the lifted item", "Home and End move it to the start or end", "Space or Enter drops and calls onReorder", "Escape or moving focus away cancels and restores the original position"],
  },
  examples: [
    { title: "Reorderable tasks", imports: 'import { createSignal } from "solid-js";', setup: 'const [tasks, setTasks] = createSignal([{ id: "a", label: "Draft notes" }, { id: "b", label: "Rotate keys" }]);', code: '<SortableList label="Tasks" items={tasks()} onReorder={event => setTasks(current => event.ids.flatMap(id => current.filter(task => task.id === id)))}>{task => <span>{task().label}</span>}</SortableList>' },
    { title: "Horizontal with handles", code: '<SortableList label="Priorities" orientation="horizontal" handle items={[{ id: "p1", label: "Speed" }, { id: "p2", label: "Cost" }]} onReorder={() => {}}>{item => item().label}</SortableList>' },
  ],
  guidance: {
    do: ["Use stable ids from your data so DOM identity, focus, and drafts survive refreshes.", "Apply the proposed ids in onReorder, or keep the old order to reject the move.", "Use handle when items contain their own interactive controls."],
    dont: ["Do not key items by index or regenerate ids on refresh.", "Do not use reordering as the only way to express priority when a numeric field is clearer.", "Do not import the drag engine directly; Sheen keeps it behind this entry."],
  },
});
