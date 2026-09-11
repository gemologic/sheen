import { Drawer } from "./Drawer.tsx";
import type { DrawerProps } from "./Drawer.tsx";
import metadata from "./Drawer.meta.ts";

export const controls = metadata.props;
export default function DrawerDemo(props: DrawerProps) { return <Drawer {...props} />; }
