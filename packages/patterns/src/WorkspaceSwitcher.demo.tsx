import { WorkspaceSwitcher } from "./WorkspaceSwitcher.tsx";
import type { WorkspaceSwitcherProps } from "./WorkspaceSwitcher.tsx";
import metadata from "./WorkspaceSwitcher.meta.ts";
export const controls = metadata.props;
export default function WorkspaceSwitcherDemo(props: WorkspaceSwitcherProps) { return <WorkspaceSwitcher {...props} />; }
