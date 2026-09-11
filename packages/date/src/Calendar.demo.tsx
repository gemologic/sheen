import { Calendar } from "./Calendar.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import type { CalendarProps } from "./Calendar.tsx";
import metadata from "./Calendar.meta.ts";
export const controls = metadata.props;
export default function CalendarDemo(props: CalendarProps = { label: "Deployment date", defaultValue: createCalendarDate(2026, 9, 8), defaultVisibleDate: createCalendarDate(2026, 9, 1) }) { return <Calendar {...props} />; }
