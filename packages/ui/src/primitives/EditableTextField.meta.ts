import { defineMeta } from "../metadata.ts";
import type { EditableTextFieldProps } from "./EditableTextField.tsx";

export default defineMeta<EditableTextFieldProps>({
  name: "EditableTextField", package: "@gemologic/sheen", category: "forms", summary: "Edits uncontrolled local text while committed form state stays app-owned and refresh-safe.",
  props: {
    value: { description: "Committed app value shown at rest." },
    label: { description: "Accessible action and input name." },
    onCommit: { description: "Commits a valid draft with cancellation." },
    validate: { description: "Returns a synchronous validation message." },
    onCommitError: { description: "Reports transport failure while the draft stays editable." },
    emptyLabel: { description: "Resting text when the committed value is empty." },
    disabled: { description: "Prevents entry into edit mode.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-focus-ring", "--sheen-color-danger-border", "--sheen-color-warning-border"],
  a11y: { role: "button at rest and textbox while editing", keyboard: ["Enter edits or commits", "Escape reverts", "Tab or blur commits"] },
  examples: [{ title: "Project name", imports: 'import { createSignal } from "solid-js";', setup: 'const [name, setName] = createSignal("North star");', code: '<EditableTextField value={name()} label="Project name" onCommit={value => { setName(value); }} />' }],
  guidance: { do: ["Read committed form state from the app, not the temporary input."], dont: ["Do not replace a dirty draft when refreshed committed data changes."] },
});
