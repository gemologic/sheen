import { defineMeta } from "../metadata.ts";
import type { ComboboxProps } from "./Combobox.tsx";

export default defineMeta<ComboboxProps>({
  name: "Combobox", package: "@gemologic/sheen", category: "forms", summary: "Editable single selection with retained async results.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } },
    options: { description: "Accepted options with unique nonempty values and labels." },
    value: { description: "Controlled selected value; null explicitly clears selection." },
    defaultValue: { description: "Initial uncontrolled selected value." },
    onValueChange: { description: "Receives committed option values, never free-form input." },
    name: { description: "Native hidden-select form name." }, form: { description: "Optional external form ID." },
    placeholder: { description: "Text shown while the editable input is empty.", control: { kind: "text" } },
    description: { description: "Supporting text associated with the input." }, error: { description: "Field validation text and invalid state." },
    disabled: { description: "Disables input, selection, and submission.", default: false }, readOnly: { description: "Allows inspection but rejects edits.", default: false }, required: { description: "Requires a committed selection for native form submission.", default: false },
    filter: { description: "Built-in label filter, or false when the app supplies externally filtered options.", default: "contains", control: { kind: "select", values: ["contains", "startsWith", "endsWith", false] } },
    onInputChange: { description: "Receives editable query changes; the app owns debounce, cancellation, and request ordering." },
    pending: { description: "Retains the last accepted result nodes and prevents stale selection while the next result set is pending.", default: false },
    resultsError: { description: "Nonblocking async-result error; field validation remains separate." }, onRetry: { description: "Optional retry action shown with resultsError." },
    inputRef: { description: "Receives the visible native input." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "combobox", keyboard: ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape"] },
  examples: [{ title: "App-owned results", code: '<Combobox label="Owner" options={[{ value: "ada", label: "Ada" }]} defaultValue="ada" />' }],
  guidance: { do: ["Set pending before replacing externally fetched options, then publish the accepted result set atomically."], dont: ["Do not commit free-form query text as the selected value."] },
});
