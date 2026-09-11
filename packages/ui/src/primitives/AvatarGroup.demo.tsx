import { AvatarGroup } from "./Avatar.tsx";
import type { AvatarGroupProps } from "./Avatar.tsx";
import metadata from "./AvatarGroup.meta.ts";

export const controls = metadata.props;
export default function AvatarGroupDemo(props: AvatarGroupProps) { return <AvatarGroup {...props} />; }
