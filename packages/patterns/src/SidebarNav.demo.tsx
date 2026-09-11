import { SidebarNav } from "./SidebarNav.tsx";
import type { SidebarNavProps } from "./SidebarNav.tsx";
import metadata from "./SidebarNav.meta.ts";
export const controls = metadata.props;
export default function SidebarNavDemo(props: SidebarNavProps) { return <SidebarNav {...props} />; }
