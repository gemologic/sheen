import { defineMeta } from "../../ui/src/metadata.ts";
import type { JSONViewerProps } from "./JSONViewer.tsx";

export default defineMeta<JSONViewerProps>({
  name: "JSONViewer", package: "@gemologic/sheen-code", category: "content", summary: "Validates and deterministically formats JSON into a searchable, copyable, virtualized line view.",
  props: {
    value: { description: "JSON-compatible value; functions, symbols, bigint, nonfinite numbers, cycles, and excessive depth are rejected." },
    label: { description: "Required accessible viewer and line-list name." },
    indent: { description: "Pretty-print indentation.", default: 2 },
    sortKeys: { description: "Sorts object keys for deterministic output.", default: true },
    maxDepth: { description: "Maximum accepted nesting depth from 1 to 64.", default: 32 },
    searchable: { description: "Shows a debounced search over formatted lines.", default: true },
    copyable: { description: "Copies the complete validated JSON string.", default: true },
    initialHeight: { description: "Deterministic SSR and initial viewport height in pixels from 120 to 1200.", default: 360 },
    lineHeight: { description: "Fixed virtual row height in pixels from 16 to 48.", default: 22 },
    onCopyError: { description: "Receives Clipboard API failures without exposing raw errors in the UI." },
    class: { description: "Additional class merged onto the viewer region." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-warning-subtle", "--sheen-font-mono"],
  a11y: { role: "named region containing a focusable virtual list and listitems", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "API response", setup: 'const response = { status: "ready", records: [{ id: "one", amount: 42 }] };', code: '<JSONViewer value={response} label="API response" />' }],
  guidance: { do: ["Pass parsed application data and let JSONViewer validate it.", "Keep sortKeys enabled for copyable diagnostics."], dont: ["Do not pass secrets or authorization material.", "Do not pass class instances and assume private properties are hidden."] },
});
