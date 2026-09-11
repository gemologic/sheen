import { LoadingState } from "./LoadingState.tsx";
import type { LoadingStateProps } from "./LoadingState.tsx";
import metadata from "./LoadingState.meta.ts";
export const controls = metadata.props;
export default function LoadingStateDemo(props: LoadingStateProps) { return <LoadingState {...props} />; }
