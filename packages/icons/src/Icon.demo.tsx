import { Icon } from "./runtime.tsx";
import type { IconProps } from "./runtime.tsx";
import metadata from "./Icon.meta.ts";

export const controls = metadata.props;
export default function IconDemo(props: IconProps) { return <Icon {...props} />; }
