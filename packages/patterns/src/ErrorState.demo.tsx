import { ErrorState } from "./ErrorState.tsx";
import type { ErrorStateProps } from "./ErrorState.tsx";
import metadata from "./ErrorState.meta.ts";
export const controls = metadata.props;
export default function ErrorStateDemo(props: ErrorStateProps) { return <ErrorState {...props} />; }
