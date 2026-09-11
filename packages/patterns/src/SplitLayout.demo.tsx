import { SplitLayout } from "./SplitLayout.tsx";
import type { SplitLayoutProps } from "./SplitLayout.tsx";
import metadata from "./SplitLayout.meta.ts";

export const controls = metadata.props;
export default function SplitLayoutDemo(props: SplitLayoutProps) { return <SplitLayout {...props} />; }
