import { MarketingSection } from "./MarketingSection.tsx";
import type { MarketingSectionProps } from "./MarketingSection.tsx";
import metadata from "./MarketingSection.meta.ts";

export const controls = metadata.props;
export default function MarketingSectionDemo(props: MarketingSectionProps) { return <MarketingSection {...props} />; }
