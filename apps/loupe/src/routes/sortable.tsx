import { Badge, Button, Heading, Row, Stack, Text, ThemeScope } from "@gemologic/sheen";
import { Board, SortableList } from "@gemologic/sheen/sortable";
import type { BoardColumn, BoardMove, SortableItem, SortableReorder } from "@gemologic/sheen/sortable";
import "@gemologic/sheen/styles/sortable.css";
import { createSignal } from "solid-js";

interface Task extends SortableItem { readonly revision: number }
interface Card extends SortableItem { readonly points: number }
type Lane = BoardColumn<Card>;

const task = (id: string, label: string, disabled = false): Task => ({ id, label, revision: 0, ...(disabled ? { disabled } : {}) });
const reorder = <Item extends SortableItem>(items: readonly Item[], event: SortableReorder): Item[] => event.ids.flatMap(id => items.filter(item => item.id === id));

const initialLanes: readonly Lane[] = [
  { id: "backlog", label: "Backlog", cards: [{ id: "c1", label: "Audit log export", points: 3 }, { id: "c2", label: "Webhook retries", points: 5 }, { id: "c3", label: "Billing worker health check", points: 2 }] },
  { id: "doing", label: "In progress", cards: [{ id: "c4", label: "Quiet audit log", points: 1 }, { id: "c5", label: "Locked compliance review", points: 8, disabled: true }] },
  { id: "review", label: "Review", cards: [] },
  { id: "done", label: "Done", cards: [{ id: "c6", label: "Retry backoff", points: 2 }] },
];

function applyMove(lanes: readonly Lane[], move: BoardMove): Lane[] {
  const card = lanes.flatMap(lane => lane.cards).find(candidate => candidate.id === move.id);
  if (!card) return [...lanes];
  return lanes.map(lane => {
    const cards = lane.cards.filter(candidate => candidate.id !== move.id);
    if (lane.id === move.toColumn) cards.splice(move.index, 0, card);
    return { ...lane, cards };
  });
}

export default function SortableFixture() {
  const [tasks, setTasks] = createSignal<readonly Task[]>([task("t1", "Draft release notes"), task("t2", "Rotate API keys"), task("t3", "Pinned incident review", true), task("t4", "Update status page"), task("t5", "Archive old dashboards")]);
  const [chips, setChips] = createSignal<readonly Task[]>([task("h1", "Alpha"), task("h2", "Beta"), task("h3", "Gamma"), task("h4", "Delta")]);
  const [rtlChips, setRtlChips] = createSignal<readonly Task[]>([task("r1", "One"), task("r2", "Two"), task("r3", "Three")]);
  const [long, setLong] = createSignal<readonly Task[]>(Array.from({ length: 40 }, (_, index) => task(`l${index + 1}`, `Queue item ${index + 1}`)));
  const [lanes, setLanes] = createSignal<readonly Lane[]>(initialLanes);
  const [moves, setMoves] = createSignal<readonly BoardMove[]>([]);
  const refresh = () => {
    setTasks(current => current.map(item => ({ ...item, revision: item.revision + 1 })));
    setLanes(current => current.map(lane => ({ ...lane, cards: lane.cards.map(card => ({ ...card })) })));
  };
  return <main><Stack gap="lg">
    <Heading level={1}>Sortable</Heading>
    <Text>Controlled reorderable lists and a Kanban board. The refresh control replaces every item object while keeping ids.</Text>
    <Row gap="sm"><Button onClick={refresh}>Refresh data</Button></Row>

    <section aria-labelledby="sortable-vertical"><Stack gap="sm">
      <Heading level={2} id="sortable-vertical">Vertical list</Heading>
      <SortableList label="Release tasks" items={tasks()} onReorder={event => setTasks(current => reorder(current, event))} style={{ "max-inline-size": "28rem" }}>
        {item => <Row gap="sm" justify="between"><span>{item().label}</span><Badge>{`r${item().revision}`}</Badge></Row>}
      </SortableList>
      <output aria-label="Task order">{tasks().map(item => item.id).join(",")}</output>
    </Stack></section>

    <section aria-labelledby="sortable-horizontal"><Stack gap="sm">
      <Heading level={2} id="sortable-horizontal">Horizontal list with handles</Heading>
      <SortableList label="Priority chips" orientation="horizontal" handle items={chips()} onReorder={event => setChips(current => reorder(current, event))}>
        {item => <span>{item().label}</span>}
      </SortableList>
      <output aria-label="Chip order">{chips().map(item => item.id).join(",")}</output>
      <ThemeScope direction="rtl">
        <SortableList label="RTL chips" orientation="horizontal" items={rtlChips()} onReorder={event => setRtlChips(current => reorder(current, event))}>
          {item => <span>{item().label}</span>}
        </SortableList>
      </ThemeScope>
      <output aria-label="RTL order">{rtlChips().map(item => item.id).join(",")}</output>
    </Stack></section>

    <section aria-labelledby="sortable-scroll"><Stack gap="sm">
      <Heading level={2} id="sortable-scroll">Scrolling list</Heading>
      <div data-testid="sortable-scroller" style={{ "block-size": "16rem", "max-inline-size": "28rem", "overflow-y": "auto" }}>
        <SortableList label="Long queue" handle items={long()} onReorder={event => setLong(current => reorder(current, event))}>{item => <span>{item().label}</span>}</SortableList>
      </div>
      <output aria-label="Queue order">{long().slice(0, 3).map(item => item.id).join(",")}|{long().slice(-3).map(item => item.id).join(",")}</output>
    </Stack></section>

    <section aria-labelledby="sortable-board"><Stack gap="sm">
      <Heading level={2} id="sortable-board">Board</Heading>
      <Board label="Sprint board" columns={lanes()} onMove={move => { setMoves(current => [...current, move]); setLanes(current => applyMove(current, move)); }}
        onColumnReorder={event => setLanes(current => reorder(current, event))}>
        {card => <Stack gap="xs"><span>{card().label}</span><Text size="ui-sm" tone="muted">{`${card().points} points`}</Text></Stack>}
      </Board>
      <output aria-label="Board layout">{lanes().map(lane => `${lane.id}:${lane.cards.map(card => card.id).join(",")}`).join(" ")}</output>
      <output aria-label="Last move">{JSON.stringify(moves().at(-1) ?? null)}</output>
    </Stack></section>
  </Stack></main>;
}
