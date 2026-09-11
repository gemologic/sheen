import { TimePicker } from "./TimePicker.tsx";
import { createTime } from "./time.ts";
import type { TimePickerProps } from "./TimePicker.tsx";
import metadata from "./TimePicker.meta.ts";
export const controls = metadata.props;
export default function TimePickerDemo(props: TimePickerProps = { label: "Review slot", stepMinutes: 30, defaultValue: createTime(14, 30) }) { return <TimePicker {...props} />; }
