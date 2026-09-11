import { Tabs } from "./Tabs.tsx";
import type { TabsProps } from "./Tabs.tsx";
import metadata from "./Tabs.meta.ts";
export const controls = metadata.props;
export default function Demo(props: TabsProps) { return <Tabs {...props} />; }
