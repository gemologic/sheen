import { defineMeta } from "../metadata.ts";
import type { MultiComboboxProps } from "./Combobox.tsx";

export default defineMeta<MultiComboboxProps>({
  name: "MultiCombobox", package: "@gemologic/sheen", category: "forms", summary: "Editable tagged selection with retained async results.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } }, options: { description: "Accepted options with unique nonempty values and labels." },
    value: { description: "Controlled ordered set of selected values." }, defaultValue: { description: "Initial uncontrolled ordered set of selected values." }, onValueChange: { description: "Receives committed unique values in selection order." },
    name: { description: "Native multi-select form name." }, form: { description: "Optional external form ID." }, placeholder: { description: "Text shown when no tags are selected.", control: { kind: "text" } },
    description: { description: "Supporting text associated with the input." }, error: { description: "Field validation text and invalid state." },
    disabled: { description: "Disables input, tags, selection, and submission.", default: false }, readOnly: { description: "Allows inspection but rejects query and tag changes.", default: false }, required: { description: "Requires at least one committed selection for native form submission.", default: false },
    filter: { description: "Built-in label filter, or false when the app supplies externally filtered options.", default: "contains", control: { kind: "select", values: ["contains", "startsWith", "endsWith", false] } },
    onInputChange: { description: "Receives editable query changes; the app owns debounce, cancellation, and request ordering." }, pending: { description: "Retains and disables the last accepted results until replacement results are accepted.", default: false },
    resultsError: { description: "Nonblocking async-result error; selected tags remain available." }, onRetry: { description: "Optional retry action shown with resultsError." }, inputRef: { description: "Receives the visible native input." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "combobox", keyboard: ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape", "Backspace"] },
  examples: [{ title: "Multiple owners", code: '<MultiCombobox label="Owners" options={[{ value: "ada", label: "Ada" }]} defaultValue={["ada"]} />' }],
  guidance: { do: ["Keep option values stable so selected tags survive filtered result subsets."], dont: ["Do not replace accepted options with a loading placeholder."] },
});
