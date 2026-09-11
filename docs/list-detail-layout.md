# ListDetailLayout

`ListDetailLayout` is a persistent master/detail workspace driven by an app-owned `RouterAdapter`. Each item needs a stable ID, visible label, and local absolute `href`. Exact destinations may include a query string; prefix matching is segment-aware. The accepted router location is the only selection source, so rejected or pending navigation cannot expose optimistic detail.

Keep the layout beneath one mounted `AppShell`. The list and detail `ScrollArea` owners remain in the DOM across item changes. On desktop they form a constrained two-pane grid. Below 768px CSS shows the list when no item is active and the detail when one is active, without rebuilding either pane. Apps provide a localized Back label and list destination.

Only one list link participates in sequential Tab order. Arrow Up/Down and Home/End move focus without navigation; Enter follows the focused native link. On phone, accepted activation moves focus to the detail region. Back returns focus to the originating link when it still exists. Modified clicks, new-tab targets, and downloads retain native anchor behavior.

The detail pane registers with AppShell restoration. Supply a stable `detailPaneId` if multiple layouts can coexist. Set `detailReady={false}` only while route content is incomplete enough to prevent a saved offset from settling; retained background refreshes should keep the accepted content mounted. The layout does not own fetching, loading UI, or authorization. Apps must immediately remove content that is no longer authorized.

The Loupe fixture uses a real delayed endpoint. During refresh it retains the article and both pane nodes, leaves previous content visible, rejects superseded results, and preserves detail scroll. Its refresh controls are sticky so activating them does not itself scroll the measured pane. Twenty animation-frame samples remain populated with the accepted revision.

Hydration is deterministic: the server receives the same accepted route and emits both panes plus the active detail. CSS determines the phone presentation before JavaScript. A blocked-script Chromium case marks all three server nodes, releases hydration, refreshes, and verifies the same nodes remain. Interactive browser tests wait for the root theme portal's observable `data-sheen-ready="true"` handoff before exercising client-only keyboard behavior; server presentation is tested separately while scripts remain blocked.

Proof: three unit/SSR cases cover exact query and longest-prefix selection, both persistent panes, accepted-only detail, and validation failures. Five Chromium cases cover roving focus, native navigation, independent history scroll positions, phone focus handoff, retained refresh content/identity/scroll, delayed hydration, and a reviewed dark desktop baseline. WebKit, physical-device behavior, and a release-wide assistive-technology pass remain open.
