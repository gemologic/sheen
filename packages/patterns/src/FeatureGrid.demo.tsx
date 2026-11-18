import { FeatureGrid } from "./FeatureGrid.tsx";
import type { FeatureGridProps } from "./FeatureGrid.tsx";
import metadata from "./FeatureGrid.meta.ts";

export const controls = metadata.props;
export default function FeatureGridDemo(props: FeatureGridProps) { return <FeatureGrid {...props} />; }
