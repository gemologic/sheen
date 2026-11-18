import { ScatterChart } from "./ScatterChart.tsx";
import type { ScatterChartProps } from "./chart-types.ts";
import metadata from "./ScatterChart.meta.ts";

export const controls = metadata.props;
export default function ScatterChartDemo(props: ScatterChartProps) { return <ScatterChart {...props} />; }
