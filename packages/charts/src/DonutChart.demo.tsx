import { DonutChart } from "./DonutChart.tsx";
import type { DonutChartProps } from "./chart-types.ts";
import metadata from "./DonutChart.meta.ts";

export const controls = metadata.props;
export default function DonutChartDemo(props: DonutChartProps) { return <DonutChart {...props} />; }
