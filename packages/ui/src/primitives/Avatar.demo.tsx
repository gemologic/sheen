import { Avatar } from "./Avatar.tsx";
import type { AvatarProps } from "./Avatar.tsx";
import metadata from "./Avatar.meta.ts";

export const controls = metadata.props;
export default function AvatarDemo(props: AvatarProps) { return <Avatar {...props} />; }
