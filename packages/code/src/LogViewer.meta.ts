import { defineMeta } from "../../ui/src/metadata.ts";
import type { LogViewerProps } from "./LogViewer.tsx";

export default defineMeta<LogViewerProps>({
  name: "LogViewer", package: "@gemologic/sheen-code", category: "content", summary: "Renders structured logs as a searchable, copyable, virtualized line stream with non-color level labels.",
  props: {
    entries: { description: "Accepted structured entries with stable IDs, timestamps, levels, and messages." },
    label: { description: "Required accessible viewer and line-list name." },
    searchable: { description: "Shows debounced search over timestamps, levels, messages, and details.", default: true },
    copyable: { description: "Copies the complete plain-text log snapshot.", default: true },
    initialHeight: { description: "Deterministic SSR and initial viewport height in pixels from 120 to 1200.", default: 360 },
    lineHeight: { description: "Fixed virtual row height in pixels from 16 to 48.", default: 22 },
    onCopyError: { description: "Receives Clipboard API failures without exposing raw errors in the UI." },
    class: { description: "Additional class merged onto the viewer region." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-warning-fg", "--sheen-color-danger-fg", "--sheen-font-mono"],
  a11y: { role: "named region containing a focusable virtual list and listitems", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Deployment logs", setup: 'const entries = [{ id: "one", timestamp: "2026-09-09T12:00:00Z", level: "info", message: "Deployment started" }] satisfies readonly LogEntry[];', imports: 'import type { LogEntry } from "@gemologic/sheen-code/log-viewer";', code: '<LogViewer entries={entries} label="Deployment logs" />' }],
  guidance: { do: ["Use stable IDs and app-formatted timestamps.", "Replace or append immutable accepted snapshots without remounting the viewer."], dont: ["Do not put secrets or raw command lines into browser-visible logs.", "Do not use color as the only severity signal."] },
});
