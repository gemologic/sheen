import { defineMeta } from "../metadata.ts";
import type { TextareaProps } from "./Textarea.tsx";

export default defineMeta<TextareaProps>({
  name: "Textarea", package: "@gemologic/sheen", category: "forms", summary: "A labeled native multiline input with optional frame-batched autosizing.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } },
    description: { description: "Instructions associated with the textarea.", control: { kind: "text" } },
    error: { description: "App-owned validation message, associated with the invalid textarea.", control: { kind: "text" } },
    autoResize: { description: "Measure content after mount and grow or shrink on input, value, width, font, or theme changes. Owns inline block-size while enabled; use min/max-block-size constraints. Rows reserves initial server geometry.", default: false, control: { kind: "boolean" } },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-text-ui-leading", "--sheen-space-block-xs"],
  a11y: { role: "multiline textbox", keyboard: ["Native multiline text editing", "Enter inserts a newline", "Tab follows native focus order"] },
  examples: [{ title: "Growing notes", code: '<Textarea label="Notes" rows={3} autoResize description="Shared with the team." />' }],
  guidance: { do: ["Reserve realistic rows on the server. Font-dependent measurement happens after hydration without replacing the control.", "Use max-block-size to cap growth; excess content remains scrollable."], dont: ["Do not autosubmit on Enter or discard drafts during background refresh.", "Do not animate height while typing or set a competing inline block-size during autosizing."] },
});
