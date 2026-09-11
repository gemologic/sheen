import { NotificationCenter } from "./NotificationCenter.tsx";
import type { NotificationCenterProps } from "./NotificationCenter.tsx";
import metadata from "./NotificationCenter.meta.ts";
export const controls = metadata.props;
export default function NotificationCenterDemo(props: NotificationCenterProps) { return <NotificationCenter {...props} />; }
