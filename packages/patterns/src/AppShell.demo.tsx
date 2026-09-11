import { AppShell } from "./AppShell.tsx";
import type { AppShellProps } from "./AppShell.tsx";
import metadata from "./AppShell.meta.ts";
export const controls = metadata.props;
export default function AppShellDemo(props: AppShellProps) { return <AppShell {...props} />; }
