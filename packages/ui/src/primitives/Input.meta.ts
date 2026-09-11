import { defineMeta } from "../metadata.ts";
import type { InputProps } from "./Input.tsx";

export default defineMeta<InputProps>({
  name: "Input", package: "@gemologic/sheen", category: "forms", summary: "A text input with a required visible label and stable accessible identity.",
  props: {
    label: { description: "Visible label, never replaced by a placeholder.", control: { kind: "text" } },
    description: { description: "Supporting instructions associated with the input.", control: { kind: "text" } },
    error: { description: "Validation message associated with the input and marking it invalid; no automatic live announcement.", control: { kind: "text" } },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-control-h-md"],
  a11y: { role: "textbox", keyboard: ["Tab", "Shift+Tab", "Native text editing"] },
  examples: [{ title: "Labeled input", code: '<Input label="Workspace name" placeholder="Enter a name" />' }],
  composer: { allowedParentRegions: ["toolbar", "main-grid", "details-panel", "overlays"], acceptedChildRegions: [], editableSafeProps: ["label", "placeholder", "disabled", "required"], fixtureFactory: "form-field", codeGenerationAdapter: "props" },
  guidance: { do: ["Use explicit labels and preserve drafts through refreshes."], dont: ["Do not rely on placeholders as labels."] },
});
