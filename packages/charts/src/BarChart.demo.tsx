import { BarChart } from "./BarChart.tsx";
import type { BarChartProps } from "./chart-types.ts";
import metadata from "./BarChart.meta.ts";

export const controls = metadata.props;
export default function BarChartDemo(props: BarChartProps) { return <BarChart {...props} />; }
