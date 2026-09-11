import { TimeSeries } from "./TimeSeries.tsx";
import type { TimeSeriesProps } from "./chart-types.ts";
import metadata from "./TimeSeries.meta.ts";

export const controls = metadata.props;
export default function TimeSeriesDemo(props: TimeSeriesProps) { return <TimeSeries {...props} />; }
