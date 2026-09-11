import { DateTimePicker } from "./DateTimePicker.tsx";
import { createDateTime } from "./date-time.ts";
import { createTimeZone } from "./time-zone.ts";
import type { DateTimePickerProps } from "./DateTimePicker.tsx";
import metadata from "./DateTimePicker.meta.ts";
export const controls = metadata.props;
export default function DateTimePickerDemo(props: DateTimePickerProps = { label: "Maintenance start", timeZoneOptions: [{ id: "UTC", label: "UTC" }, { id: "America/New_York", label: "New York" }], defaultValue: createDateTime(1788897600000, createTimeZone("UTC")) }) { return <DateTimePicker {...props} />; }
