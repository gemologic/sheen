import { defineMeta } from "../metadata.ts";
import type { TagInputProps } from "./TagInput.tsx";

export default defineMeta<TagInputProps>({
  name: "TagInput", package: "@gemologic/sheen", category: "forms", summary: "An ordered free-form tag editor with native multi-value submission and stale-safe async validation.",
  props: {
    ref: { description: "Native root reference." }, inputRef: { description: "Native editable-input reference." }, label: { description: "Required visible field label.", control: { kind: "text" } }, name: { description: "Native multi-value form name." }, form: { description: "Optional external form ID." },
    value: { description: "Controlled ordered unique nonempty tag values." }, defaultValue: { description: "Initial uncontrolled values restored on uncanceled form reset." }, onValueChange: { description: "Receives ordered committed tag values." },
    validate: { description: "Optional sync or async candidate validator. It receives accepted values and an AbortSignal; stale completions cannot publish." }, onValidationError: { description: "Receives unexpected validator failures after the retained draft receives a localized error." }, normalize: { description: "Synchronous candidate normalization before uniqueness and validation; defaults to trim." },
    placeholder: { description: "Editable-input placeholder shown only when no tags exist.", control: { kind: "text" } }, description: { description: "Supporting text associated with the editor." }, error: { description: "App-owned field error, distinct from candidate validation." }, disabled: { description: "Disables editing, removal, reordering, validation, and form submission.", default: false }, readOnly: { description: "Keeps values and controls inspectable while rejecting changes.", default: false }, required: { description: "Requires at least one committed tag in the native form projection.", default: false }, commitKeys: { description: "Keys that validate and commit the current draft; defaults to Enter and comma." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border-control", "--sheen-color-neutral-subtle", "--sheen-color-focus-ring"],
  a11y: { role: "labeled text input and native multi-select projection", keyboard: ["Enter", "Comma", "Backspace", "Delete", "Alt+Arrow keys", "Alt+Home", "Alt+End"] },
  examples: [{ title: "Project labels", code: '<TagInput label="Labels" name="labels" defaultValue={["frontend", "urgent"]} description="Press Enter to add a label." />' }],
  guidance: { do: ["Use stable exact strings when order and free-form entry both matter."], dont: ["Do not use TagInput for selection from a controlled taxonomy; use MultiCombobox."] },
});
