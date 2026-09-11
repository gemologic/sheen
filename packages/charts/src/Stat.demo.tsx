import { Stat } from "./Stat.tsx";
import type { StatProps } from "./chart-types.ts";
import metadata from "./Stat.meta.ts";

export const controls = metadata.props;
export default function StatDemo(props: StatProps) { return <Stat {...props} />; }
