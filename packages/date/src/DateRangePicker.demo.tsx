import { DateRangePicker } from "./DatePicker.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import { createDateRange } from "./date-range.ts";
import type { DateRangePickerProps } from "./DatePicker.tsx";
import metadata from "./DateRangePicker.meta.ts";
export const controls = metadata.props;
export default function DateRangePickerDemo(props: DateRangePickerProps = { label: "Report window", defaultValue: createDateRange(createCalendarDate(2026, 9, 1), createCalendarDate(2026, 9, 8)) }) { return <DateRangePicker {...props} />; }
