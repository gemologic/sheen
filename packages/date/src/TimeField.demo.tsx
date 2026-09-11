import { TimeField } from "./TimeField.tsx";
import { createTime } from "./time.ts";
import type { TimeFieldProps } from "./TimeField.tsx";
import metadata from "./TimeField.meta.ts";
export const controls = metadata.props;
export default function TimeFieldDemo(props: TimeFieldProps = { label: "Cutoff time", defaultValue: createTime(16, 30) }) { return <TimeField {...props} />; }
