import { LogoCloud } from "./LogoCloud.tsx";
import type { LogoCloudProps } from "./LogoCloud.tsx";
import metadata from "./LogoCloud.meta.ts";

export const controls = metadata.props;
export default function LogoCloudDemo(props: LogoCloudProps) { return <LogoCloud {...props} />; }
