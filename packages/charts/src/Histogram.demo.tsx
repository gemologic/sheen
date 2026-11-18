import { Histogram } from "./Histogram.tsx";
import type { HistogramProps } from "./chart-types.ts";
import metadata from "./Histogram.meta.ts";

export const controls = metadata.props;
export default function HistogramDemo(props: HistogramProps) { return <Histogram {...props} />; }
