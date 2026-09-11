# App-owned optimistic operations

`optimistic(apply, commit)` applies a synchronous local change and returns a promise for the commit result. `apply` must return a revert callback, which may finish synchronously or asynchronously. Sheen owns neither the data store nor transport.

- `apply` runs immediately. If it throws, commit is not called. The app must make apply atomic or clean up its own partial work before throwing, because no revert callback has been returned yet.
- A successful commit returns its result unchanged and does not run revert.
- A thrown or rejected commit runs revert exactly once. The returned promise waits for rollback and then rejects with the original commit failure.
- If rollback also fails, the promise rejects with an AggregateError containing the commit failure first and rollback failure second. Its cause is the commit failure. Neither error is discarded.
- Overlapping operations are permitted. The app's revert must preserve newer changes, using inverse operations or version checks appropriate to its data. Restoring an old whole-object snapshot can overwrite unrelated later edits; this helper cannot infer the correct inverse.

Undo after success is a separate app-owned operation, potentially requiring another server request. Retrying is also explicit: call the helper again with a fresh apply/commit pair. The helper neither retries automatically nor interprets dismissal of a notification as transport cancellation. A commit may use an app-supplied AbortSignal through its closure.

A transport rejection does not prove that the server failed to apply the operation. Apps still own idempotency, server reconciliation, authorization, logging, and ambiguous-result handling. Local rollback is not a transaction spanning client and server.

The `/optimistic` Loupe fixture uses a bounded real HTTP endpoint, not intercepted fetches. It shows pending state without replacing an unrelated input, preserves a newer independent edit when an earlier request is rejected, permits a deliberate retry, and demonstrates explicit undo as a second commit. It is a stateless qualification fixture, not an application data backend.

Toast/Toaster integration remains unfinished. The helper does not silently emit a notification or swallow its rejection; apps must handle the returned promise and choose the appropriate visible error/undo/retry affordance.
