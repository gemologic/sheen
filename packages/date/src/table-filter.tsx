import type { JSX } from "solid-js";
import { createCalendarDate, parseCalendarDate, serializeCalendarDate } from "./calendar-date.ts";
import { createDateRange } from "./date-range.ts";
import { DatePicker, DateRangePicker } from "./DatePicker.tsx";
import type { CalendarDate, DateRange } from "./types.ts";

export interface DateFilterEditorProps {
  readonly mode: "single" | "range";
  readonly label: string;
  readonly endLabel: string;
  readonly value: string;
  readonly endValue: string;
  readonly onValueChange: (value: string, endValue: string) => void;
  readonly disabled: boolean;
}

function optionalDate(value: string): CalendarDate | null {
  if (!value) return null;
  try { return parseCalendarDate(value); }
  catch { return null; }
}

function optionalRange(start: string, end: string): DateRange | null {
  const first = optionalDate(start);
  const last = optionalDate(end);
  if (first === null || last === null) return null;
  try { return createDateRange(first, last); }
  catch { return null; }
}

/** Package-isolated adapter for FilterBar and DataTable filterBar.dateEditor. */
export function dateFilterEditor(props: DateFilterEditorProps): JSX.Element {
  const visible = () => optionalDate(props.value) ?? optionalDate(props.endValue) ?? createCalendarDate(2000, 1, 1);
  if (props.mode === "range") return <DateRangePicker label={props.label} endLabel={props.endLabel} value={optionalRange(props.value, props.endValue)} defaultVisibleDate={visible()} disabled={props.disabled}
    onValueChange={value => props.onValueChange(value === null ? "" : serializeCalendarDate(value.start), value === null ? "" : serializeCalendarDate(value.end))} />;
  return <DatePicker label={props.label} value={optionalDate(props.value)} defaultVisibleDate={visible()} disabled={props.disabled}
    onValueChange={value => props.onValueChange(value === null ? "" : serializeCalendarDate(value), "")} />;
}
