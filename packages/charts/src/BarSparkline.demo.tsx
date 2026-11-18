import { BarSparkline } from "./BarSparkline.tsx";
import type { BarSparklineProps } from "./chart-types.ts";
import metadata from "./BarSparkline.meta.ts";

export const controls = metadata.props;
export default function BarSparklineDemo(props: BarSparklineProps) { return <BarSparkline {...props} />; }
