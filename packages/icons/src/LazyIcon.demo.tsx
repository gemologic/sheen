import { LazyIcon } from "./lazy.tsx";
import type { LazyIconProps } from "./lazy.tsx";
import metadata from "./LazyIcon.meta.ts";

export const controls = metadata.props;
export default function LazyIconDemo(props: LazyIconProps = { name: "gitBranch" }) { return <LazyIcon {...props} />; }
