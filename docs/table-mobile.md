# Phone DataTable cards

`DataTable` remains a virtualized semantic table by default. Set `mobileLayout` only when the application needs an alternate card presentation below 768px:

```tsx
<DataTable
  data={accounts}
  columns={columns}
  getRowId={row => row.id}
  caption="Accounts"
  pagination={false}
  mobileLayout={{ pageSize: 20, titleColumn: "name" }}
/>
```

`mobileLayout={true}` uses the first visible column as the heading and 20 cards per continuous page. An options object can select a defined title column and a page size from 1 through 100. If the chosen title column becomes hidden, the first visible column takes over. With no visible columns, the stable row ID remains as the heading.

## Paging ownership

Phone paging never changes the data contract.

- A continuous table still owns one complete bounded accepted result. The card page is local presentation state over that result. It resets after filter or sort changes and clamps when the accepted result shrinks. Client export, footer callbacks, all-matching selection, and URL state continue to use the complete result.
- A numbered table already has the right bound. Cards render its accepted page directly and the existing Pagination requests another accepted page. `mobileLayout.pageSize` is intentionally ignored in this case.
- Cursor/infinite loading remains a separate deferred contract. The component never walks a server or silently turns a partial response into a continuous result.

## Equivalent interaction

The card view keeps the shared filter and column toolbar and adds a Sort menu for visible sortable columns. A page-level checkbox selects only the displayed card page. Each data card uses the same selection state, field/cell renderer, optional editor controller, Enter activation, and action model as its table row. Actions have a visible per-card overflow button, so a touch-only gesture is never the sole route. Phone cards do not replace the native long-press context menu.

Arrow Up/Down plus Home/End move among cards. Space changes selection, Enter activates data rows, and grouped or hierarchical cards preserve their expansion controls. The selection action bar reserves a phone safe area so it cannot cover local Pagination.

## Hydration and refresh

The responsive choice is CSS-only. Server and client render the same virtual table plus one bounded card window; the table is visible at 768px and above, while cards are visible below it. There is no pre-hydration `window` or `matchMedia` branch and no mount-time swap.

Positional card roots are retained when a local page or accepted server result changes, while their stable row attributes and content update atomically. During delegated refresh, accepted cards remain visible at full opacity. Query-changing controls and row actions are disabled, the progress status waits 500ms, and failure retains cards with Retry. Cold loads reserve card skeleton geometry immediately and reveal it only after 200ms.

Two SSR cases prove bounded continuous cards, numbered-page reuse, accessibility labels, and option validation. Five real Chromium cases prove a ten-card DOM bound over 45 rows, selection/actions/activation, local sort reset, unobstructed paging, desktop fallback, real delayed server refresh with zero blank sampled frames, delayed hydration with retained roots, and the dark visual baseline. WebKit remains part of release-wide qualification.
