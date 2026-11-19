import { NativeDateTimeField } from "./native.tsx";
import { createTimeZone } from "./time-zone.ts";
import type { NativeDateTimeFieldProps } from "./native.tsx";
import metadata from "./NativeDateTimeField.meta.ts";
export const controls = metadata.props;
export default function NativeDateTimeFieldDemo(props: NativeDateTimeFieldProps = { label: "Maintenance start", timeZone: createTimeZone("America/New_York") }) { return <NativeDateTimeField {...props} />; }
