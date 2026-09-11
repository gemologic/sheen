# Notification ownership

`createToaster()` creates a controller inside a Solid owner. Its queue and action executions are local to that instance; there is no module-global notification store. Disposal clears its state and prevents later notifications from being created through that controller.

The controller provides the state/action layer, and `Toast` provides its message card. `Toaster` implements the scoped queue presenter, live announcements, visible queue limit, visible-time expiry, and transient exit handling. A notification's duration is configuration, not a running timer in the controller or card. Full cross-browser, assistive-technology, and release qualification remain separate gates.

## Queue presenter

Mount one `<Toaster controller={notices} />` for each owner-local controller. A duplicate presenter is rejected. `limit` defaults to three and counts visible and exiting cards; queued cards do not start their timers until presented. The presenter mounts only after its theme portal is ready, never at `document.body`.

Reducing the limit temporarily returns excess cards to the queue. Their consumed lifetime is retained by notification ID; showing them again resumes the remainder. Replacing a message through `update` starts the replacement's configured lifetime. Keep the presenter mounted in application chrome: unmounting it cancels timers and releases its lease but does not clear its controller. A new presenter starts a fresh presentation session for retained notifications. Disposing the controller's owner clears its queue, and late action results cannot revive it or affect another controller.

Hover or focus inside the region pauses expiry. Pending and failed actions remain available regardless of their configured lifetime. Polite/assertive announcements use safe message text and scoped labels without taking focus. Escape inside a card dismisses it; notifications do not take over a dialog's Escape ownership. Dismissal does not cancel an application request.

Starting a focused action moves focus to the card's Close button before disabling the pending action. Dismissal or successful completion restores the recorded opener only while focus remains inside that card. A deliberate move into another editor is never reversed. If the opener was removed or cannot receive focus, the notification region is the fallback. Exiting cards become inert and accessibility-hidden immediately; removal waits for their actual browser animations to settle, including cancellation or zero-duration reduced motion.

Browser evidence currently covers remaining-time focus pause, native tab inactivity, queue/hover lifetime, rejection retention, pre-hydration trigger replay, and scoped modal dismissal. The inactivity regression disables Playwright's forced-focus override after navigation and verifies native inactive/active document state around real tab switching before asserting timer behavior.

## Toast card

Pass `notification`, `onAction`, and `onDismiss`. A controller-backed presenter calls `runAction(notification.id)` and `dismiss(notification.id)` from those callbacks. Keep the same card mounted when the snapshot changes so message refreshes and failure/retry state changes retain their native controls.

The card associates its visible title, description, and safe failure text. Pending actions disable the action button and expose busy state while keeping dismissal available. Failure changes the action label to the supplied retry label or scoped retry message. Close, retry, and loading copy inherit ThemeScope messages; colors, density, and direction inherit the active theme.

The card is a labeled group, not a live announcer. A notification presenter must announce status changes without moving focus, following [W3C status-message guidance](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html). Do not treat the current card as a complete accessible transient notification system. Essential information and actions need an untimed alternative or an appropriate adjustable timing mechanism, as described in [W3C timing guidance](https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable).

## Controller contract

- `show(options)` snapshots the message and action descriptor and returns an opaque symbol handle. Handles are ephemeral and controller-local, not persistence keys or DOM IDs.
- `notifications()` exposes a readonly, frozen ordered list of notification snapshots. Renderers should key by the handle, not message text or array position.
- `update(id, options)` replaces the complete message, clears any failure state, and invalidates the previous action completion. It does not merge an old action or description into the replacement.
- `dismiss(id)` removes only that notification. `clear()` affects only this controller. Missing or foreign handles are ignored.
- `runAction(id)` invokes the app-supplied action. A second invocation while pending is ignored. Current success removes the message; current failure retains it with state `failed`, preserving the raw error separately from the safe, app-localized `action.errorMessage`.
- Actions retry only when explicitly invoked again. A presenter should use `retryLabel` or its scoped default retry message after failure and must not render raw rejection values as user-facing copy.

`runAction` resolves to `succeeded`, `failed` with the rejection value, or `ignored`. A completion is ignored if its notification was updated, dismissed, cleared, or disposed while the action was pending. This prevents a stale result from closing a replacement message or reviving an old error. It does **not** mean the application operation was canceled or never reached the server. The app still owns transport cancellation, idempotency, logging, and reconciliation.

Notifications default to polite priority. Neutral/success messages default to a 5,000ms visible lifetime; actions, warnings, and errors default to persistent. A caller may explicitly choose a positive finite duration or null. Presenter implementation must count visible time only and preserve failed/pending actions while they require attention. Message titles, action labels/error messages, and any supplied retry label must be nonempty.

The controller does not call `optimistic` automatically. An app may use that helper inside an action, with its own apply/commit pair and safe inverse. See [optimistic-operations.md](optimistic-operations.md).
