import { NavList } from "./NavList.tsx";
import type { NavListProps } from "./NavList.tsx";
import metadata from "./NavList.meta.ts";
export const controls = metadata.props;
export default function NavListDemo(props: NavListProps) { return <NavList {...props} />; }
