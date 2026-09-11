import { Meter } from "./Progress.tsx";
import type { MeterProps } from "./Progress.tsx";
import metadata from "./Meter.meta.ts";

export const controls = metadata.props;
export default function MeterDemo(props: MeterProps) { return <Meter {...props} />; }
