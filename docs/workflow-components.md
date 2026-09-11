# Workflow components

`ActivityTimeline` and `Stepper` share the closed workflow states `completed`, `current`, `upcoming`, and `error`. Every state has visible text and a distinct marker symbol, so color is supplementary. Both components reconcile item objects by stable string ID; background refresh can replace records without replacing surviving list items.

`ActivityTimeline` is an ordered list of article entries. Each item requires a title and state, with optional description and actor. Supply `timestamp` and `timeLabel` together: the former becomes the machine-readable `datetime`, while the latter is the explicit locale-aware display text owned by the app. `refreshing` adds busy semantics to retained accepted entries without a skeleton, blank state, dimming, or remount.

`Stepper` is a named navigation landmark containing a native progress element and ordered list. A step is a discriminated union:

- `status` renders non-interactive progress text.
- `link` renders a native Sheen `Link` because it changes the URL.
- `action` renders a native Sheen `Button` because it performs an in-place operation.

At most one step may be current. `aria-current="step"` marks it, and the progress value counts completed steps. Horizontal presentation stacks through a component container query below 36rem; vertical presentation never depends on viewport width. Compact density changes spacing, not semantics or target behavior. `refreshing` retains step nodes and focused controls while accepted state changes.

Proof: two focused SSR/validation cases and four Chromium cases cover complete server semantics, machine/display time pairing, duplicate/current-state validation, link/button keyboard behavior, native progress, visible state labels, narrow container layout, compact RTL content, real delayed refresh with frame sampling and retained focus/identity, delayed hydration, and axe. A live Chrome DevTools review reports the expected navigation/progress/control tree and Lighthouse accessibility 100. WebKit and manual assistive-technology qualification remain release-wide work.
