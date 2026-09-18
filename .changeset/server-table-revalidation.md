---
"@gemologic/sheen-table": patch
---

Add the server DataTable `refreshKey` prop for background revalidation and post-mutation invalidation. Key changes request the latest query through the existing abortable request controller, retaining accepted content, pagination, column layout, drafts, selection, and scroll. Initial keys do not trigger duplicate hydration requests.
