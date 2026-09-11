import { TimeZoneSelect } from "./TimeZoneSelect.tsx";
import { createTimeZone } from "./time-zone.ts";
import type { TimeZoneSelectProps } from "./TimeZoneSelect.tsx";
import metadata from "./TimeZoneSelect.meta.ts";
export const controls = metadata.props;
export default function TimeZoneSelectDemo(props: TimeZoneSelectProps = { label: "Market timezone", options: [{ id: "UTC", label: "UTC" }, { id: "America/New_York", label: "New York" }], defaultValue: createTimeZone("UTC") }) { return <TimeZoneSelect {...props} />; }
