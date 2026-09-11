import { SegmentedControl } from "./SegmentedControl.tsx";
import type { SegmentedControlProps } from "./SegmentedControl.tsx";
import metadata from "./SegmentedControl.meta.ts";

export const controls = metadata.props;
export default function SegmentedControlDemo(props: SegmentedControlProps = { label: "Report period", name: "period", options: [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }], defaultValue: "week" }) { return <SegmentedControl {...props} />; }
