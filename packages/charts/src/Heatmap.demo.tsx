import { Heatmap } from "./Heatmap.tsx";
import type { HeatmapProps } from "./chart-types.ts";
import metadata from "./Heatmap.meta.ts";

export const controls = metadata.props;
export default function HeatmapDemo(props: HeatmapProps) { return <Heatmap {...props} />; }
