import { ShortcutSheet } from "./ShortcutSheet.tsx";
import type { ShortcutSheetProps } from "./ShortcutSheet.tsx";
import metadata from "./ShortcutSheet.meta.ts";
export const controls = metadata.props;
export default function ShortcutSheetDemo(props: ShortcutSheetProps) { return <ShortcutSheet {...props} />; }
