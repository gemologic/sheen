import { defineMeta } from "../../ui/src/metadata.ts";
import type { CodeBlockProps } from "./CodeBlock.tsx";

export default defineMeta<CodeBlockProps>({
  name: "CodeBlock",
  package: "@gemologic/sheen-code",
  category: "content",
  summary: "Renders accessible source with an optional file header, copy and wrap actions, line emphasis, and serializable Shiki tokens.",
  props: {
    code: { description: "Exact source text to render." },
    language: { description: "Language identifier used for labeling and highlighted-output validation." },
    highlighted: { description: "Optional serializable result produced by highlightCode in a loader or build step." },
    highlightedLines: { description: "One-based line numbers or inclusive ranges to emphasize visually and describe to assistive technology." },
    label: { description: "Visible caption and accessible name for the code region." },
    filename: { description: "Optional filename rendered in the header and used as the fallback accessible name." },
    lineNumbers: { description: "Shows non-selectable line numbers.", default: false },
    showLanguage: { description: "Shows the language identifier in the header.", default: false },
    copyable: { description: "Shows an action that copies the exact source through the browser Clipboard API.", default: false },
    wrapToggle: { description: "Shows an accessible control for changing line wrapping.", default: false },
    wrapped: { description: "Controlled wrapping state." },
    defaultWrapped: { description: "Initial uncontrolled wrapping state.", default: false },
    onWrappedChange: { description: "Receives a proposed wrapping state in controlled or uncontrolled use." },
    onCopyError: { description: "Receives a Clipboard API failure; raw errors are never rendered." },
    class: { description: "Additional class merged onto the figure." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-color-accent", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset", "--sheen-font-mono", "--sheen-text-code-size"],
  a11y: { role: "figure with a focusable preformatted region and optional header actions", keyboard: ["Tab focuses copy, wrap, and scroll controls", "Enter or Space activates a focused header action"] },
  examples: [{
    title: "Copyable TypeScript file",
    setup: "const source = 'const ready: boolean = true;'",
    code: '<CodeBlock code={source} language="ts" filename="ready.ts" label="Readiness example" lineNumbers showLanguage copyable wrapToggle highlightedLines={[1]} />',
  }],
  guidance: {
    do: ["Precompute highlightCode in a server loader or build step when syntax color is required.", "Pass the exact accepted source to copy and highlight; retain the CodeBlock owner during refresh."],
    dont: ["Do not run the highlighter during component render or replace accepted code while refreshing tokens.", "Do not use highlighted lines as the only indication of an error or status."],
  },
});
