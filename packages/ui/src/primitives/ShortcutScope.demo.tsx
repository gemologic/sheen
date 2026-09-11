import { ShortcutScope } from "./ShortcutScope.tsx";
import type { ShortcutScopeProps } from "./ShortcutScope.tsx";
import metadata from "./ShortcutScope.meta.ts";
export const controls = metadata.props;
export default function ShortcutScopeDemo(props: ShortcutScopeProps) { return <ShortcutScope {...props} />; }
