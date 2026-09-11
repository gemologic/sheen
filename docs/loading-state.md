# LoadingState

`LoadingState` is exported by `@gemologic/sheen-patterns`. It receives an explicit app-owned `phase` (`idle`, `cold`, or `refresh`), a required accessible `label`, a required layout-matched `fallback`, and persistent content children. Load the patterns stylesheet alongside sheen styles.

Cold mode reserves the fallback's geometry immediately, hides it visually for 200ms, and then reveals it. The fallback wrapper is inert and aria-hidden. The app supplies Skeleton primitives matching the actual layout; there is no universal page skeleton. Content children stay mounted but hidden during cold mode. Apps must guard data-dependent rendering themselves and must not place interactive controls in the fallback.

Refresh mode leaves content mounted and visible. The named region becomes busy immediately; after 500ms a 2px indeterminate progress bar appears at the pane's top without taking layout space or intercepting pointer input. Reduced motion renders a static bar. Idle mode hides all indicators immediately. Phase changes and owner disposal cancel outstanding indicator timers.

SSR emits deterministic markup with indicators unrevealed. Indicator delays begin after hydration, or at the subsequent phase change, not from an unknown server request start time. Children are not replaced during the handoff. Layout reservation depends on the app supplying correct skeleton geometry.

This is not a fetcher, Suspense boundary, cache, error handler, or authorization boundary. The app owns request ordering, stale-result rejection, accepted data, and errors. Use ErrorState beside retained authorized content after failure. Do not select cold mode for ordinary refresh. Hidden content is still in the DOM; remove unauthorized data rather than hiding it on account/permission changes.

Qualification includes real SSR, equal cold/content geometry in a matched fixture, delayed HTTP success/failure, retained DOM/drafts, hydration replay, and animation-frame samples showing no hidden-content or skeleton frames during refresh. Frame samples also verify animated and reduced-motion progress and absence of late indicators after an immediate refresh. Native click timestamps and observed style changes verify indicators do not precede their 200ms/500ms thresholds, including a cold-to-refresh switch before the cold timer expires. Disposal before reveal leaves detached fallback markup unchanged through a real delayed request; a fresh instance reveals normally. These five browser cases pass three consecutive repetitions.

This is DOM/computed-style continuity evidence, not a compositor screenshot proof or a promise that a busy browser will run timers exactly on time. Full visual/contrast matrices and cross-browser qualification remain open.
