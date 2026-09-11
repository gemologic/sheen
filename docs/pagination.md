# Pagination

Pagination is a controlled dataset-page request control under ThemeProvider. Supply zero-based pageIndex, a nonnegative safe-integer pageCount, and onPageChange. Props describe accepted results, not a requested page. Empty results use index zero and count zero. Invalid or out-of-range state throws; the data owner must apply coherent clamping after deletions or filter changes.

The control renders first/previous/next/last actions and at most five numbered pages, independent of the total. The accepted page uses aria-current="page", following the [ARIA current-item contract](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA26). These native Buttons request a dataset change; URL destinations should use Link rather than treating this component as a general website pagination-link list.

pending guards all request paths without replacing controls or the accepted summary. Unavailable actions use aria-disabled and an activation guard, not native disabled, to retain keyboard focus when a request starts or the last page is accepted. They remain in normal Tab order. Enter and Space activate available actions; repeated, out-of-range, empty-result, and pending activations are ignored. The component never fetches or announces an optimistic requested page.

The status output is polite and atomic; the enclosing navigation is busy while pending. New accepted props update the announcement. The owner retains previous results, reports errors, offers retry, and decides when to move focus/scroll into newly accepted rows. The component owns neither the table request lifecycle nor page-size/filter resets.

If an external accepted-state update removes the focused numbered button, Pagination restores focus to the accepted page button, or the first control when results become empty. It does not move focus from an outside control or from a surviving button, and skips hidden/inert targets. Recovery uses preventScroll and does not request a page. The owner still supplies coherently clamped index/count values.

Navigation/button labels and page/status templates come from provider messages. pageLabel supports {page}; pageStatus supports {page} and {pages}. Numbers use the explicit scoped locale. Empty results announce page zero of zero rather than inventing a first page. Logical layout wraps at narrow widths.

Proof: four SSR tests cover bounded controls, accepted/empty summaries, invalid inputs, and German locale/message overrides. Four real Chromium cases pass twice each, exercising the delayed/erroring transport fixture, pending and retry behavior, focus/node continuity, bounded large counts, Arabic RTL number formatting, empty activation guards, delayed hydration replay, and external-result focus recovery without stealing outside focus. The external-update case failed before the focus fix and passes afterward. UI build, lint/typechecks, and manifest validation pass at 77 components and 80 examples.

Reviewed visual matrices, assistive-technology announcement observation, other engines, and DataTable integration remain open. The Pagination TODO is not yet marked complete. In particular, this control does not implement the table's paginated/non-paginated processing modes.
