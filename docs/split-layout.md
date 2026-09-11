# SplitLayout

`SplitLayout` composes two persistent application-owned content slots over the general `Resizable` primitive. Give the layout and both scroll regions nonempty accessible names, plus a task-oriented separator label such as `Resize source and preview`. The logical start/end names follow document direction.

Use `sizes` and `onSizesChange` when application state controls the fractions. Use `defaultSizes` for local state. `persistence.initialSizes` must come from the server-known request state so the first markup, CSS geometry, and hydrated geometry agree. Its `save` function may return a real asynchronous request; `onError` reports failures through application UI. Neither SplitLayout nor Resizable reads localStorage, cookies, or a network endpoint.

Horizontal layouts use `narrowLayout="stack"` by default. The breakpoint is the component's own inline container, not the viewport. Narrow presentation stacks the same start and end owners in document order and removes the adjustable separator from display; it does not build a second mobile tree. Returning to wider space restores the previous fractions, DOM identity, native drafts, and focus targets. Set `narrowLayout="split"` only when both panes remain meaningfully usable in constrained space.

Give the component a constrained block size when independent pane scrolling is desired. In document-flow/mobile contexts, allow its block size to become automatic so both stacked panes remain reachable. `refreshing` adds busy semantics and a stable progress boundary while leaving accepted pane content mounted and interactive where the app permits.
