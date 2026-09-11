# Tree

`Tree` and `TreeItem` implement a hierarchical treeview using the [WAI-ARIA treeview pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). Use it for genuinely nested objects. A flat destination list belongs in `NavList`; tabular hierarchy belongs in `DataTable`'s treegrid mode.

Every item requires a nonempty stable `value` and visible `label`. Values remain stable across label changes, reordering, and background refresh. `Tree` keeps focus, expansion, selection, and activation as distinct states:

- One item participates in the page Tab order. Arrow Up/Down moves through visible items; Home/End moves to the first/last visible item.
- Arrow Right expands a closed branch, then moves into an open branch. Arrow Left collapses an open branch, then moves to its parent. `*` expands the current sibling group.
- Printable characters perform wrapping typeahead using the explicit scoped locale. Repeated characters cycle matching labels.
- Space changes selection. Enter calls `onActivate` without changing selection; without an activation callback, Enter toggles a branch.
- `selectionMode="none"` omits selection semantics, `single` permits one value, and `multiple` exposes `aria-multiselectable` and modifier-free toggling. Disabled items remain discoverable in the arrow-key sequence but cannot select, activate, or expand.

The leading expander is a named pointer target outside the roving Tab sequence. A double click on a branch row also toggles it. All changes are proposals in controlled mode; rejected selected or expanded arrays remain authoritative.

## Retained hierarchy and hydration

Collapsed child groups remain in the server and client DOM with `hidden` and `inert`; expanding a branch reveals the same child owners. This makes no-script output structurally complete and prevents expansion from manufacturing a second tree during hydration. If collapse hides the focused descendant, focus returns to that branch. If refreshed data removes the focused item, the root moves focus to the nearest surviving visible item.

Refresh labels, counts, and children under stable item owners. Do not key the whole Tree by a request or swap it for loading markup. Loupe exercises a real delayed response that changes a label and adds a child while preserving the tree, branch, collapsed descendant, focus, selection, and expanded state through every sampled frame. Separate delayed-hydration coverage verifies the original server nodes and initial ARIA state survive adoption. Chromium is qualified; WebKit remains part of the release-wide gate.
