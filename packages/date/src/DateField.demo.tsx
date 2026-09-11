import { DateField } from "./DateField.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import type { DateFieldProps } from "./DateField.tsx";
import metadata from "./DateField.meta.ts";
export const controls = metadata.props;
export default function DateFieldDemo(props: DateFieldProps = { label: "Invoice date", defaultValue: createCalendarDate(2026, 9, 8) }) { return <DateField {...props} />; }
