import { DatePicker } from "./DatePicker.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import type { DatePickerProps } from "./DatePicker.tsx";
import metadata from "./DatePicker.meta.ts";
export const controls = metadata.props;
export default function DatePickerDemo(props: DatePickerProps = { label: "Settlement date", defaultValue: createCalendarDate(2026, 9, 10), defaultVisibleDate: createCalendarDate(2026, 9, 1) }) { return <DatePicker {...props} />; }
