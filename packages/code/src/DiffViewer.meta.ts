import { defineMeta } from "../../ui/src/metadata.ts";
import type { DiffViewerProps } from "./DiffViewer.tsx";

export default defineMeta<DiffViewerProps>({
  name: "DiffViewer", package: "@gemologic/sheen-code", category: "content", summary: "Shows a searchable, copyable unified line diff with bounded computation and virtualized large-content DOM.",
  props: {
    oldText: { description: "Complete accepted source before the change." },
    newText: { description: "Complete accepted source after the change." },
    label: { description: "Required accessible viewer and line-list name." },
    oldLabel: { description: "Label used by the copied unified diff header.", default: "Before" },
    newLabel: { description: "Label used by the copied unified diff header.", default: "After" },
    searchable: { description: "Shows a debounced line search that does not mutate the source.", default: true },
    copyable: { description: "Copies the complete unified diff.", default: true },
    initialHeight: { description: "Deterministic SSR and initial viewport height in pixels from 120 to 1200.", default: 360 },
    lineHeight: { description: "Fixed virtual row height in pixels from 16 to 48.", default: 22 },
    onCopyError: { description: "Receives Clipboard API failures without exposing raw errors in the UI." },
    class: { description: "Additional class merged onto the viewer region." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-danger-subtle", "--sheen-color-success-subtle", "--sheen-font-mono"],
  a11y: { role: "named region containing a focusable virtual list and listitems", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Configuration change", setup: 'const before = "port = 80\\nenabled = false";\nconst after = "port = 443\\nenabled = true";', code: '<DiffViewer oldText={before} newText={after} label="Configuration changes" oldLabel="before.toml" newLabel="after.toml" />' }],
  guidance: { do: ["Keep the viewer mounted when accepted source refreshes.", "Use labels that identify both revisions."], dont: ["Do not rely on red and green alone; prefixes and accessible row labels encode change kind.", "Do not use the viewer as an editable merge tool."] },
});
