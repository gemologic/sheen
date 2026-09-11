import { NavItem, NavList } from "./NavList.tsx";
import type { NavItemProps } from "./NavList.tsx";
import metadata from "./NavItem.meta.ts";
export const controls = metadata.props;
export default function NavItemDemo(props: NavItemProps) { return <NavList label="Example navigation"><NavItem {...props} /></NavList>; }
