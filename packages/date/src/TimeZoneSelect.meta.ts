import { defineMeta } from "@gemologic/sheen/metadata";
import type { TimeZoneSelectProps } from "./TimeZoneSelect.tsx";

export default defineMeta<TimeZoneSelectProps>({
  name: "TimeZoneSelect", package: "@gemologic/sheen-date", category: "date and time", summary: "An app-bounded IANA timezone combobox with stable SSR and hydration options.",
  props: {
    label: { description: "Required visible combobox label." }, options: { description: "Explicit stable IANA IDs and app-localized labels; no host-derived default list." }, value: { description: "App-owned Sheen TimeZone, or null." }, defaultValue: { description: "Initial uncontrolled zone." }, onValueChange: { description: "Receives validated Sheen TimeZone values and clearing." }, name: { description: "Native form field name for the IANA identifier." }, form: { description: "Optional external form owner." }, placeholder: { description: "Empty-selection text." }, description: { description: "Associated instructions." }, error: { description: "Associated field validation error." }, pending: { description: "Retains accepted options while an app-owned refresh is in flight.", default: false }, resultsError: { description: "Safe app-owned option request error shown in the open list." }, onRetry: { description: "Optional app retry action for a failed option request." }, required: { description: "Requires a selection.", default: false }, disabled: { description: "Disables interaction and projection.", default: false }, readOnly: { description: "Allows inspection while rejecting changes.", default: false },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "combobox and listbox", keyboard: ["Tab", "Arrow keys", "Home", "End", "Enter", "Escape", "Typeahead"] },
  examples: [{ title: "Market timezone", code: '<TimeZoneSelect label="Market timezone" name="timeZone" options={[{ id: "UTC", label: "UTC" }, { id: "America/New_York", label: "New York" }]} defaultValue={createTimeZone("UTC")} />' }],
  guidance: { do: ["Commit one stable option list for server and client rendering."], dont: ["Do not call Intl.supportedValuesOf during render; ICU lists can differ across hosts."] },
});
