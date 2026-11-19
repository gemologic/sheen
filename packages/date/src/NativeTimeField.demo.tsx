import { NativeTimeField } from "./native.tsx";
import { createTime } from "./time.ts";
import type { NativeTimeFieldProps } from "./native.tsx";
import metadata from "./NativeTimeField.meta.ts";
export const controls = metadata.props;
export default function NativeTimeFieldDemo(props: NativeTimeFieldProps = { label: "Daily cutoff", defaultValue: createTime(17, 30) }) { return <NativeTimeField {...props} />; }
