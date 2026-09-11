import { TopNav } from "./TopNav.tsx";
import type { TopNavProps } from "./TopNav.tsx";
import metadata from "./TopNav.meta.ts";
export const controls = metadata.props;
export default function TopNavDemo(props: TopNavProps) { return <TopNav {...props} />; }
