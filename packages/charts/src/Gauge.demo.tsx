import { Gauge } from "./Gauge.tsx";
import type { GaugeProps } from "./chart-types.ts";
import metadata from "./Gauge.meta.ts";

export const controls = metadata.props;
export default function GaugeDemo(props: GaugeProps) { return <Gauge {...props} />; }
