import { SiteHeader } from "./SiteHeader.tsx";
import type { SiteHeaderProps } from "./SiteHeader.tsx";
import metadata from "./SiteHeader.meta.ts";

export const controls = metadata.props;
export default function SiteHeaderDemo(props: SiteHeaderProps) { return <SiteHeader {...props} />; }
