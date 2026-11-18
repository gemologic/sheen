# Sortable lists and boards

`@gemologic/sheen/sortable` exports `SortableList` and `Board`. Import their styles from `@gemologic/sheen/styles/sortable.css`; neither the components nor the stylesheet are part of the root entry or `styles.css`, so applications that never reorder anything pay nothing.

```tsx
import { Board, SortableList } from "@gemologic/sheen/sortable";
import type { BoardColumn, BoardMove, SortableReorder } from "@gemologic/sheen/sortable";
import "@gemologic/sheen/styles/sortable.css";
```

## Controlled contract

Both components are controlled. They never reorder owner data; they propose a move and render whatever the owner passes back.

- `SortableList` calls `onReorder({ id, fromIndex, toIndex, ids })`. `ids` is the complete proposed order.
- `Board` calls `onMove({ id, fromColumn, fromIndex, toColumn, index })`. `index` is the card's final index in `toColumn`, measured after it leaves its origin, so `cards.splice(index, 0, card)` on the filtered column is correct for same-column and cross-column moves.
- `Board` calls `onColumnReorder({ id, fromIndex, toIndex, ids })` when it is provided; providing it is what enables the column grip.

To reject a move, keep the previous data. To apply it asynchronously, the item snaps back until the accepted data arrives.

Items need stable, unique, nonempty `id`s and a `label`. Labels name the grip buttons and fill the announcements. Card ids must be unique across the whole board. Duplicate ids throw during render on both the server and the client.

## Identity and refresh

Items render through a keyed `For` over ids. A refresh that replaces every item object with a new one of the same id keeps each item's DOM node, focus, and any in-progress keyboard lift; the `children` render function runs once per id and reads fresh data from its accessor. A refresh that removes the lifted item ends the lift. Moving a card to another column re-creates its node in that column, because each column owns its list; focus follows the card.

## Pointer

Pointer dragging uses the Pragmatic drag and drop engine through a private Sheen module; applications never import it. Bindings attach after mount, so server markup is complete and identical without script. While dragging:

- the source dims, and it carries the raised `elevation-overlay` look at the moment the browser captures its drag preview;
- an accent line marks the insertion point on the logical axis, and a column outline marks an append into a column or an empty column;
- every scrolling ancestor of the list (and, for the board, the column scroller and each card list) plus the window auto-scrolls near its edges.

Drop indicators are hidden for no-op positions. Disabled items and disabled columns never start a drag, and disabled columns never accept a card.

## Keyboard

The keyboard target is the item itself, or its grip button when `handle` is set. Use `handle` when items contain their own controls.

| Key | Action |
| --- | --- |
| Space, Enter | Pick up; with an item lifted, drop it and propose the move |
| ArrowUp, ArrowDown | Move within a vertical list or a board column |
| ArrowLeft, ArrowRight | Move within a horizontal list, to the adjacent enabled board column, or reorder a lifted column; mirrored in RTL |
| Home, End | Move to the start or end of the list or column |
| Escape | Cancel and restore the original position |

Moving focus away from a lifted item cancels the lift. A visually hidden description explains the model, and an assertive status region announces pickup, each move, the drop, and cancellation with the item, column, and position formatted in the scoped locale.

## Messages

English defaults live in `englishSortableMessages`. Each component resolves messages in this order: the per-instance `messages` prop, then scoped `ThemeProvider` messages with the same key, then English. Keys: `sortableInstructions`, `sortableHandle`, `sortableLifted`, `sortableMoved`, `sortableDropped`, `sortableCancelled`, `boardInstructions`, `boardCardHandle`, `boardColumnHandle`, `boardLifted`, `boardMoved`, `boardDropped`, `boardCancelled`, `boardEmptyColumn`, and `boardCardCount`. Templates use `{label}`, `{column}`, `{position}`, and `{count}`.

## Layout

`SortableList` lays out as a column or, with `orientation="horizontal"`, a row. Items are raised surfaces. `Board` columns are `--sheen-board-column-size` (18rem) wide in a horizontally scrolling row; below the `sm` breakpoint (40rem) each column takes 85% of the board and columns snap, with snapping suspended during a drag so auto-scroll can move freely. Card lists scroll when the application bounds the board's block size.

Nothing animates on mount. State changes (lift, drop target, dimming) use the motion duration tokens, which are zero under reduced motion.
