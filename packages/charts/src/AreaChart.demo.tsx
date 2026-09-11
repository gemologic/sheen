import { AreaChart } from "./ContinuousSvgChart.tsx";
import type { AreaChartProps } from "./chart-types.ts";
import metadata from "./AreaChart.meta.ts";

export const controls = metadata.props;
export default function AreaChartDemo(props: AreaChartProps) { return <AreaChart {...props} />; }
