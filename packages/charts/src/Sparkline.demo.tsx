import { Sparkline } from "./Sparkline.tsx";
import type { SparklineProps } from "./chart-types.ts";
import metadata from "./Sparkline.meta.ts";

export const controls = metadata.props;
export default function SparklineDemo(props: SparklineProps) { return <Sparkline {...props} />; }
