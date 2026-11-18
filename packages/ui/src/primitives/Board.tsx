import { For, Show, batch, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { useNumberFormatter } from "../theme/intl.ts";
import { cn } from "../utils/cn.ts";
import { closestEdge, dropIndex, edgeField, formatMessage, isRtl, keyIntent, moveId, resolveSortableMessages, scrollContainers, stringField, validateIds } from "./sortable-core.ts";
import type { SortableEdge, SortableItem, SortableMessages, SortableReorder } from "./sortable-core.ts";
import { bindDraggable, bindDropTarget, bindMonitor } from "./sortable-drag.ts";
import type { DragData } from "./sortable-drag.ts";
import { Glyph } from "./Glyph.tsx";

export interface BoardColumn<Card extends SortableItem = SortableItem> {
  readonly id: string;
  /** Column title, used by the default header and in announcements. */
  readonly label: string;
  readonly cards: readonly Card[];
  /** A disabled column neither accepts cards nor lets its cards or itself be picked up. */
  readonly disabled?: boolean;
}

export interface BoardMove {
  readonly id: string;
  readonly fromColumn: string;
  readonly fromIndex: number;
  readonly toColumn: string;
  /** Final index in `toColumn`, measured after the card leaves its original position. */
  readonly index: number;
}

export type BoardCardOf<Column extends BoardColumn> = Column["cards"][number];

export type BoardProps<Column extends BoardColumn> = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "ref" | "onDrop"> & {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  /** Owner-ordered columns. Column and card ids are stable and unique across the board. */
  columns: readonly Column[];
  children: (card: Accessor<BoardCardOf<Column>>, column: Accessor<Column>) => JSX.Element;
  /** Replaces the default title and count inside each column header. The reorder handle stays Sheen-owned. */
  columnHeader?: (column: Accessor<Column>, count: Accessor<number>) => JSX.Element;
  /** Proposes a card move. The board is controlled: nothing moves until the owner passes updated columns back. */
  onMove: (move: BoardMove) => void;
  /** Enables column reordering through each header's handle. */
  onColumnReorder?: (reorder: SortableReorder) => void;
  /** Accessible name for the board. */
  label: string;
  /** Render a grip button on each card that owns pointer and keyboard dragging. Without it the whole card drags and takes focus. */
  handle?: boolean;
  disabled?: boolean;
  messages?: Partial<SortableMessages>;
};

interface Position { readonly column: string; readonly index: number }
type Lift =
  | { readonly kind: "card"; readonly id: string; readonly origin: Position; readonly target: Position }
  | { readonly kind: "column"; readonly id: string; readonly origin: number; readonly target: number };
type Indicator =
  | { readonly kind: "card"; readonly id: string; readonly edge: SortableEdge }
  | { readonly kind: "append"; readonly id: string }
  | { readonly kind: "column"; readonly id: string; readonly edge: SortableEdge };

function sameIndicator(first: Indicator | undefined, second: Indicator | undefined): boolean {
  if (!first || !second) return first === second;
  return first.kind === second.kind && first.id === second.id && (first.kind === "append" || second.kind === "append" || first.edge === second.edge);
}

/** A controlled Kanban board: cards move within and between columns, and columns optionally reorder. */
export function Board<Column extends BoardColumn>(props: BoardProps<Column>): JSX.Element {
  const theme = useTheme();
  const formatter = useNumberFormatter();
  const generatedId = createUniqueId();
  const instance = Symbol("Board");
  const [local, others] = splitProps(props, ["ref", "class", "columns", "children", "columnHeader", "onMove", "onColumnReorder", "label", "handle", "disabled", "messages", "aria-describedby"]);
  const messages = createMemo(() => resolveSortableMessages(theme.messages(), local.messages));
  const columnIndex = createMemo(() => {
    validateIds(local.columns.map(column => column.id), "Board columns");
    validateIds(local.columns.flatMap(column => column.cards.map(card => card.id)), "Board cards");
    return new Map(local.columns.map(column => [column.id, column]));
  });
  const cardIndex = createMemo(() => {
    const map = new Map<string, { readonly card: BoardCardOf<Column>; readonly column: string }>();
    for (const column of local.columns) for (const card of column.cards) map.set(card.id, { card, column: column.id });
    return map;
  });
  const ownedColumns = createMemo(() => [...columnIndex().keys()]);
  const ownedCards = (column: string) => columnIndex().get(column)?.cards.map(card => card.id) ?? [];
  const [lift, setLift] = createSignal<Lift>();
  const [indicator, setIndicator] = createSignal<Indicator>();
  const [dragging, setDragging] = createSignal<string>();
  const [announcement, setAnnouncement] = createSignal("");
  // A refresh that removes the lifted card, its target column, or the lifted column ends the lift.
  const activeLift = createMemo(() => {
    const current = lift();
    if (!current) return undefined;
    if (current.kind === "column") return columnIndex().has(current.id) ? current : undefined;
    return cardIndex().has(current.id) && columnIndex().has(current.target.column) ? current : undefined;
  });
  const columnIds = createMemo(() => {
    const current = activeLift();
    return current?.kind === "column" ? moveId(ownedColumns(), current.id, current.target) : ownedColumns();
  });
  const cardIds = (column: string): string[] => {
    const current = activeLift();
    const owned = ownedCards(column);
    if (current?.kind !== "card") return owned;
    const without = owned.filter(id => id !== current.id);
    if (current.target.column !== column) return without;
    without.splice(Math.min(without.length, current.target.index), 0, current.id);
    return without;
  };
  const instructionsId = `${generatedId}-instructions`;
  let root: HTMLDivElement | undefined;
  let scroller: HTMLDivElement | undefined;
  let relocating = false;
  let disposed = false;
  onCleanup(() => { disposed = true; });

  const columnDisabled = (column: string) => Boolean(local.disabled || columnIndex().get(column)?.disabled);
  const cardDisabled = (id: string) => {
    const entry = cardIndex().get(id);
    return !entry || columnDisabled(entry.column) || Boolean(entry.card.disabled);
  };
  const columnLabel = (column: string) => columnIndex().get(column)?.label ?? column;
  const accepts = (source: DragData) => source.boardInstance === instance;
  const find = (selector: string, attribute: string, id: string) => [...root?.querySelectorAll<HTMLElement>(selector) ?? []].find(element => element.getAttribute(attribute) === id);
  const keyboardTarget = (kind: Lift["kind"], id: string): HTMLElement | undefined => {
    if (kind === "column") return find(".sheen-board-column", "data-column-id", id)?.querySelector<HTMLElement>(".sheen-board-column-handle") ?? undefined;
    const card = find(".sheen-board-card", "data-card-id", id);
    return local.handle ? card?.querySelector<HTMLElement>(".sheen-board-card-handle") ?? undefined : card;
  };
  const say = (text: string) => {
    setAnnouncement("");
    queueMicrotask(() => { if (!disposed) setAnnouncement(text); });
  };
  const count = (value: number) => formatter().format(value);
  const announceCard = (template: string, id: string, position: Position) => say(formatMessage(template, {
    label: cardIndex().get(id)?.card.label ?? id, column: columnLabel(position.column),
    position: count(position.index + 1), count: count(ownedCards(position.column).filter(card => card !== id).length + 1),
  }));
  const announceColumn = (template: string, id: string, position: number) => say(formatMessage(template, {
    label: columnLabel(id), position: count(position + 1), count: count(ownedColumns().length),
  }));
  const relocate = (kind: Lift["kind"], id: string, update: () => void) => {
    relocating = true;
    try { update(); }
    finally {
      const target = keyboardTarget(kind, id);
      if (target && target.ownerDocument.activeElement !== target) target.focus();
      relocating = false;
    }
  };
  const cardPosition = (id: string): Position | undefined => {
    const entry = cardIndex().get(id);
    return entry ? { column: entry.column, index: ownedCards(entry.column).indexOf(id) } : undefined;
  };
  const proposeCard = (id: string, target: Position) => {
    const origin = cardPosition(id);
    if (!origin || (origin.column === target.column && origin.index === target.index)) return;
    local.onMove({ id, fromColumn: origin.column, fromIndex: origin.index, toColumn: target.column, index: target.index });
  };
  const proposeColumn = (id: string, fromIndex: number, toIndex: number) => {
    if (!local.onColumnReorder || fromIndex === toIndex || fromIndex < 0) return;
    local.onColumnReorder({ id, fromIndex, toIndex, ids: moveId(ownedColumns(), id, toIndex) });
  };
  const cancel = () => {
    const current = activeLift();
    setLift(undefined);
    if (current?.kind === "card") announceCard(messages().boardCancelled, current.id, current.origin);
    else if (current) announceColumn(messages().sortableCancelled, current.id, current.origin);
  };
  const neighbourColumn = (from: string, delta: -1 | 1): string | undefined => {
    const order = columnIds();
    for (let position = order.indexOf(from) + delta; position >= 0 && position < order.length; position += delta) {
      const candidate = order[position];
      if (candidate !== undefined && !columnDisabled(candidate)) return candidate;
    }
    return undefined;
  };
  const moveCard = (current: Extract<Lift, { kind: "card" }>, intent: NonNullable<ReturnType<typeof keyIntent>>): Position | undefined => {
    const room = (column: string) => ownedCards(column).filter(id => id !== current.id).length;
    const { column, index } = current.target;
    if (intent.kind === "edge") return { column, index: intent.to === "start" ? 0 : room(column) };
    if (intent.kind !== "step") return undefined;
    if (intent.axis === "vertical") return { column, index: Math.max(0, Math.min(room(column), index + intent.delta)) };
    const next = neighbourColumn(column, intent.delta);
    return next ? { column: next, index: Math.min(index, room(next)) } : undefined;
  };
  const onKeyDown = (kind: Lift["kind"], id: string, event: KeyboardEvent, element: HTMLElement) => {
    if (event.target !== element || event.altKey || event.ctrlKey || event.metaKey) return;
    const intent = keyIntent(event.key, isRtl(element));
    const current = activeLift();
    if (!intent) return;
    if (!current) {
      if (intent.kind !== "toggle") return;
      if (kind === "card") {
        const origin = cardPosition(id);
        if (!origin || cardDisabled(id)) return;
        event.preventDefault();
        setLift({ kind, id, origin, target: origin });
        announceCard(messages().boardLifted, id, origin);
      } else {
        if (columnDisabled(id)) return;
        event.preventDefault();
        const origin = ownedColumns().indexOf(id);
        setLift({ kind, id, origin, target: origin });
        announceColumn(messages().sortableLifted, id, origin);
      }
      return;
    }
    if (current.id !== id || current.kind !== kind) return;
    event.preventDefault();
    if (intent.kind === "cancel") { relocate(kind, id, cancel); return; }
    if (current.kind === "card") {
      if (intent.kind === "toggle") {
        relocate(kind, id, () => batch(() => { proposeCard(id, current.target); setLift(undefined); }));
        announceCard(messages().boardDropped, id, current.target);
        return;
      }
      const target = moveCard(current, intent);
      if (!target || (target.column === current.target.column && target.index === current.target.index)) return;
      relocate(kind, id, () => setLift({ ...current, target }));
      announceCard(messages().boardMoved, id, target);
      return;
    }
    if (intent.kind === "toggle") {
      relocate(kind, id, () => batch(() => { proposeColumn(id, current.origin, current.target); setLift(undefined); }));
      announceColumn(messages().sortableDropped, id, current.target);
      return;
    }
    if (intent.kind === "step" && intent.axis !== "horizontal") return;
    const last = ownedColumns().length - 1;
    const target = intent.kind === "edge" ? (intent.to === "start" ? 0 : last) : Math.max(0, Math.min(last, current.target + intent.delta));
    if (target === current.target) return;
    relocate(kind, id, () => setLift({ ...current, target }));
    announceColumn(messages().sortableMoved, id, target);
  };
  const onFocusOut = (id: string, event: FocusEvent, element: HTMLElement) => {
    if (relocating || activeLift()?.id !== id) return;
    if (event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) return;
    cancel();
  };
  const resolveCardDrop = (cardId: string, target: DragData): { readonly position: Position; readonly indicator: Indicator } | undefined => {
    const column = stringField(target, "columnId");
    if (!column) return undefined;
    const others = ownedCards(column).filter(id => id !== cardId);
    if (target.kind === "column") return { position: { column, index: others.length }, indicator: { kind: "append", id: column } };
    const over = stringField(target, "cardId");
    const edge = edgeField(target);
    if (!over || !edge || over === cardId) return undefined;
    const index = others.indexOf(over) + (edge === "after" ? 1 : 0);
    return { position: { column, index }, indicator: { kind: "card", id: over, edge } };
  };
  const resolveColumnDrop = (columnId: string, target: DragData) => {
    const over = stringField(target, "columnId");
    const edge = edgeField(target);
    if (target.kind !== "column" || !over || !edge) return undefined;
    const from = ownedColumns().indexOf(columnId);
    const to = dropIndex(from, ownedColumns().indexOf(over), edge);
    return to === from ? undefined : { from, to, indicator: { kind: "column", id: over, edge } satisfies Indicator };
  };
  const isNoop = (cardId: string, position: Position) => {
    const origin = cardPosition(cardId);
    return origin?.column === position.column && origin.index === position.index;
  };

  onMount(() => {
    if (!scroller) return;
    const columns = scroller;
    onCleanup(bindMonitor({
      accepts,
      scrollers: () => scrollContainers(columns, ...columns.querySelectorAll<HTMLElement>(".sheen-board-cards")),
      onDrag: (source, target) => {
        const sourceId = stringField(source, "sourceId");
        let next: Indicator | undefined;
        if (sourceId && target && source.kind === "card") {
          const drop = resolveCardDrop(sourceId, target);
          next = drop && !isNoop(sourceId, drop.position) ? drop.indicator : undefined;
        } else if (sourceId && target && source.kind === "column") next = resolveColumnDrop(sourceId, target)?.indicator;
        if (!sameIndicator(indicator(), next)) setIndicator(next);
      },
      onDrop: (source, target) => {
        setIndicator(undefined);
        const sourceId = stringField(source, "sourceId");
        if (!sourceId || !target) return;
        if (source.kind === "card") {
          const drop = resolveCardDrop(sourceId, target);
          if (!drop || isNoop(sourceId, drop.position)) return;
          proposeCard(sourceId, drop.position);
          announceCard(messages().boardDropped, sourceId, drop.position);
        } else if (source.kind === "column") {
          const drop = resolveColumnDrop(sourceId, target);
          if (!drop) return;
          proposeColumn(sourceId, drop.from, drop.to);
          announceColumn(messages().sortableDropped, sourceId, drop.to);
        }
      },
    }));
  });

  return <div {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-board", local.class)}
    role="group" aria-label={local.label} aria-describedby={[instructionsId, local["aria-describedby"]].filter(Boolean).join(" ")}
    data-disabled={local.disabled ? "" : undefined} data-active={activeLift() || dragging() ? "" : undefined}>
    <div ref={scroller} class="sheen-board-columns">
      <For each={columnIds()}>{columnId => {
        const initial = columnIndex().get(columnId);
        if (!initial) throw new Error(`Board: missing column ${JSON.stringify(columnId)}`);
        let lastColumn = initial;
        const column = () => { const value = columnIndex().get(columnId); if (value) lastColumn = value; return lastColumn; };
        const cards = createMemo(() => cardIds(columnId), undefined, { equals: (first, second) => first.length === second.length && first.every((id, position) => id === second[position]) });
        const total = () => cards().length;
        const headerId = createUniqueId();
        const disabled = () => columnDisabled(columnId);
        const lifted = () => activeLift()?.kind === "column" && activeLift()?.id === columnId;
        const columnIndicator = () => { const value = indicator(); return value && value.kind !== "card" && value.id === columnId ? value : undefined; };
        let section: HTMLDivElement | undefined;
        let columnHandle: HTMLButtonElement | undefined;
        createEffect(() => {
          if (!section) return;
          const target = section;
          const reorderable = Boolean(local.onColumnReorder);
          const release = [bindDropTarget({
            element: target,
            accepts: source => accepts(source) && !disabled() && (source.kind === "card" || reorderable),
            data: input => ({ kind: "column", columnId, edge: closestEdge(target, input, "horizontal") }),
          })];
          if (reorderable && columnHandle) release.push(bindDraggable({
            element: target, handle: columnHandle, canDrag: () => !disabled() && !activeLift(),
            data: () => ({ boardInstance: instance, kind: "column", sourceId: columnId }),
            onStart: () => setDragging(columnId), onEnd: () => setDragging(undefined),
          }));
          onCleanup(() => { for (const cleanup of release) cleanup(); });
        });
        return <div ref={section} class="sheen-board-column" role="group" aria-labelledby={headerId} data-column-id={columnId}
          data-disabled={disabled() ? "" : undefined} data-lifted={lifted() ? "" : undefined} data-dragging={dragging() === columnId ? "" : undefined}
          data-drop-target={columnIndicator()?.kind === "append" ? "" : undefined}
          data-drop-edge={(() => { const value = columnIndicator(); return value?.kind === "column" ? value.edge : undefined; })()}>
          <div class="sheen-board-column-header">
            <Show when={local.onColumnReorder}>
              <button ref={columnHandle} type="button" class="sheen-sortable-handle sheen-board-column-handle" aria-label={formatMessage(messages().boardColumnHandle, { label: column().label })}
                aria-describedby={instructionsId} aria-pressed={lifted() ? "true" : "false"} disabled={disabled()}
                onKeyDown={event => onKeyDown("column", columnId, event, event.currentTarget)} onFocusOut={event => onFocusOut(columnId, event, event.currentTarget)}>
                <Glyph class="sheen-sortable-grip" name="grip" />
              </button>
            </Show>
            <div id={headerId} class="sheen-board-column-heading">
              <Show when={local.columnHeader} fallback={<>
                <span class="sheen-board-column-title">{column().label}</span>
                <span class="sheen-board-column-count" aria-label={formatMessage(messages().boardCardCount, { count: count(total()) })}>{count(total())}</span>
              </>}>{render => render()(column, total)}</Show>
            </div>
          </div>
          <ul class="sheen-board-cards" role="list" aria-labelledby={headerId}>
            <For each={cards()}>{cardId => <BoardCardNode cardId={cardId} column={column} />}</For>
          </ul>
          <Show when={total() === 0}><p class="sheen-board-empty">{messages().boardEmptyColumn}</p></Show>
        </div>;
      }}</For>
    </div>
    <span id={instructionsId} class="sheen-sortable-hidden">{messages().boardInstructions}</span>
    <span class="sheen-sortable-hidden" role="status" aria-live="assertive" aria-atomic="true">{announcement()}</span>
  </div>;

  function BoardCardNode(card: { readonly cardId: string; readonly column: Accessor<Column> }): JSX.Element {
    const id = card.cardId;
    const initial = cardIndex().get(id);
    if (!initial) throw new Error(`Board: missing card ${JSON.stringify(id)}`);
    let last: BoardCardOf<Column> = initial.card;
    const value = (): BoardCardOf<Column> => { const entry = cardIndex().get(id); if (entry) last = entry.card; return last; };
    const disabled = () => cardDisabled(id);
    const lifted = () => activeLift()?.kind === "card" && activeLift()?.id === id;
    const ownKeys = () => !local.handle;
    const cardIndicator = () => { const current = indicator(); return current?.kind === "card" && current.id === id ? current.edge : undefined; };
    let element: HTMLLIElement | undefined;
    let handle: HTMLButtonElement | undefined;
    createEffect(() => {
      if (!element) return;
      const target = element;
      const dragHandle = local.handle ? handle : undefined;
      const release = [
        bindDraggable({
          element: target, handle: dragHandle, canDrag: () => !disabled() && !activeLift(),
          data: () => ({ boardInstance: instance, kind: "card", sourceId: id }),
          onStart: () => setDragging(id), onEnd: () => setDragging(undefined),
        }),
        bindDropTarget({
          element: target,
          accepts: source => accepts(source) && source.kind === "card" && !columnDisabled(card.column().id),
          data: input => ({ kind: "card", cardId: id, columnId: card.column().id, edge: closestEdge(target, input, "vertical") }),
        }),
      ];
      onCleanup(() => { for (const cleanup of release) cleanup(); });
    });
    return <li ref={element} class="sheen-board-card" data-card-id={id}
      data-disabled={disabled() ? "" : undefined} data-lifted={lifted() ? "" : undefined} data-dragging={dragging() === id ? "" : undefined} data-drop-edge={cardIndicator()}
      tabindex={ownKeys() && !disabled() ? 0 : undefined} aria-describedby={ownKeys() ? instructionsId : undefined} aria-disabled={ownKeys() && disabled() ? "true" : undefined}
      onKeyDown={event => { if (ownKeys()) onKeyDown("card", id, event, event.currentTarget); }}
      onFocusOut={event => { if (ownKeys()) onFocusOut(id, event, event.currentTarget); }}>
      <Show when={local.handle}>
        <button ref={handle} type="button" class="sheen-sortable-handle sheen-board-card-handle" aria-label={formatMessage(messages().boardCardHandle, { label: value().label })}
          aria-describedby={instructionsId} aria-pressed={lifted() ? "true" : "false"} disabled={disabled()}
          onKeyDown={event => onKeyDown("card", id, event, event.currentTarget)} onFocusOut={event => onFocusOut(id, event, event.currentTarget)}>
          <Glyph class="sheen-sortable-grip" name="grip" />
        </button>
      </Show>
      <div class="sheen-board-card-content">{local.children(value, card.column)}</div>
    </li>;
  }
}
