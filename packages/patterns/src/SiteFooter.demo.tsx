import { SiteFooter } from "./SiteFooter.tsx";
import type { SiteFooterProps } from "./SiteFooter.tsx";
import metadata from "./SiteFooter.meta.ts";

export const controls = metadata.props;
export default function SiteFooterDemo(props: SiteFooterProps) { return <SiteFooter {...props} />; }
