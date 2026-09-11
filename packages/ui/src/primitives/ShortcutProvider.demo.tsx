import { ShortcutProvider } from "./ShortcutProvider.tsx";
import type { ShortcutProviderProps } from "./ShortcutProvider.tsx";
import metadata from "./ShortcutProvider.meta.ts";
export const controls = metadata.props;
export default function ShortcutProviderDemo(props: ShortcutProviderProps) { return <ShortcutProvider {...props} />; }
