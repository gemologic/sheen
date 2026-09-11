import { defineMeta } from "@gemologic/sheen/metadata";
import type { CalendarProps } from "./Calendar.tsx";

export default defineMeta<CalendarProps>({
  name: "Calendar", package: "@gemologic/sheen-date", category: "date and time", summary: "An always-visible locale-aware calendar with Ark-backed grid keyboard interaction.",
  props: {
    label: { description: "Required visible calendar label." },
    value: { description: "App-owned Sheen CalendarDate, or null for no selection." },
    defaultValue: { description: "Initial uncontrolled selection." },
    onValueChange: { description: "Receives requested Sheen-owned selection changes." },
    minValue: { description: "Earliest selectable calendar date." },
    maxValue: { description: "Latest selectable calendar date." },
    isDateUnavailable: { description: "Marks otherwise in-range dates unavailable using Sheen CalendarDate values." },
    defaultVisibleDate: { description: "Deterministic initially visible month; empty calendars otherwise use 2000-01-01." },
    locale: { description: "Explicit BCP 47 locale, defaulting to theme context." },
    calendar: { description: "Optional Unicode calendar identifier affecting presentation and interaction, not the stored ISO date." },
    name: { description: "Native form field name for the YYYY-MM-DD projection." },
    form: { description: "Optional external form owner." },
    required: { description: "Marks the calendar selection required for accessible semantics.", default: false },
    disabled: { description: "Prevents focus and selection.", default: false },
    readOnly: { description: "Allows inspection while rejecting selection changes.", default: false },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-accent", "--sheen-color-focus-ring"],
  a11y: { role: "application calendar grid", keyboard: ["Arrow keys", "PageUp", "PageDown", "Home", "End", "Enter", "Space"] },
  examples: [{ title: "Deployment date", code: '<Calendar label="Deployment date" name="deploymentDate" defaultValue={createCalendarDate(2026, 9, 8)} defaultVisibleDate={createCalendarDate(2026, 9, 1)} />' }],
  guidance: { do: ["Provide defaultVisibleDate for empty SSR output near the application's working date."], dont: ["Do not derive initial visible dates from the browser clock during hydration."] },
});
