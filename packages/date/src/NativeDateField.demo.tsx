import { NativeDateField } from "./native.tsx";
import { createCalendarDate } from "./calendar-date.ts";
import type { NativeDateFieldProps } from "./native.tsx";
import metadata from "./NativeDateField.meta.ts";
export const controls = metadata.props;
export default function NativeDateFieldDemo(props: NativeDateFieldProps = { label: "Invoice date", defaultValue: createCalendarDate(2026, 9, 8) }) { return <NativeDateField {...props} />; }
