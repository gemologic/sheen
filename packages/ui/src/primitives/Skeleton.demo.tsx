import { Skeleton } from "./Skeleton.tsx";
import type { SkeletonProps } from "./Skeleton.tsx";
import metadata from "./Skeleton.meta.ts";

export const controls = metadata.props;
export default function SkeletonDemo(props: SkeletonProps) { return <Skeleton {...props} />; }
