import { StatGroup } from "./Stat.tsx";
import type { StatGroupProps } from "./chart-types.ts";
import metadata from "./StatGroup.meta.ts";

export const controls = metadata.props;
export default function StatGroupDemo(props: StatGroupProps) { return <StatGroup {...props} />; }
