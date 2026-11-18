---
"@gemologic/sheen-table": patch
---

DataTable keyboard navigation, row focus, and scroll anchoring resolve row positions from the index the caller already knows instead of scanning every row, and the header selection count is derived from the selection model's explicit/excluded IDs instead of walking every loaded row. Client CSV/JSON export code now loads on first use; the captured view, selection, columns, error, and reset behavior are unchanged.
