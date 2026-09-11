import { Sheet } from "./Drawer.tsx";
import type { SheetProps } from "./Drawer.tsx";
import metadata from "./Sheet.meta.ts";

export const controls = metadata.props;
export default function SheetDemo(props: SheetProps) { return <Sheet {...props} />; }
