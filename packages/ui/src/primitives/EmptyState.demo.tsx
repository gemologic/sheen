import { EmptyState } from "./EmptyState.tsx";
import type { EmptyStateProps } from "./EmptyState.tsx";
import metadata from "./EmptyState.meta.ts";

export const controls = metadata.props;
export default function EmptyStateDemo(props: EmptyStateProps) { return <EmptyState {...props} />; }
