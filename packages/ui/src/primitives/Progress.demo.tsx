import { Progress } from "./Progress.tsx";
import type { ProgressProps } from "./Progress.tsx";
import metadata from "./Progress.meta.ts";

export const controls = metadata.props;
export default function ProgressDemo(props: ProgressProps) { return <Progress {...props} />; }
