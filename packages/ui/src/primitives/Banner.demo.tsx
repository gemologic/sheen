import { Banner } from "./Notice.tsx";
import type { BannerProps } from "./Notice.tsx";
import { Link } from "./Link.tsx";
import metadata from "./Banner.meta.ts";

export const controls = metadata.props;
export default function BannerDemo(props: BannerProps) {
  return <Banner tone="warning" heading="Scheduled maintenance" actions={<Link href="#status">Status page</Link>} onDismiss={() => {}} {...props}>{props.children ?? "Writes pause Saturday 02:00–02:30 UTC."}</Banner>;
}
