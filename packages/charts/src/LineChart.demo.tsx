import { LineChart } from "./ContinuousSvgChart.tsx";
import type { LineChartProps } from "./chart-types.ts";
import metadata from "./LineChart.meta.ts";

export const controls = metadata.props;
export default function LineChartDemo(props: LineChartProps) { return <LineChart {...props} />; }
