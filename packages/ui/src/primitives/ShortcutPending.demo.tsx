import { ShortcutPending } from "./ShortcutPending.tsx";
import type { ShortcutPendingProps } from "./ShortcutPending.tsx";
import metadata from "./ShortcutPending.meta.ts";
export const controls = metadata.props;
export default function ShortcutPendingDemo(props: ShortcutPendingProps = {}) { return <ShortcutPending {...props} />; }
