import { Spinner } from "./Spinner.tsx";
import type { SpinnerProps } from "./Spinner.tsx";
import metadata from "./Spinner.meta.ts";

export const controls = metadata.props;
export default function SpinnerDemo(props: SpinnerProps) { return <Spinner {...props} />; }
