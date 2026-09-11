import { LinkTooltip } from "./LinkTooltip.tsx";
import type { LinkTooltipProps } from "./LinkTooltip.tsx";
import metadata from "./LinkTooltip.meta.ts";
export const controls = metadata.props;
export default function LinkTooltipDemo(props: LinkTooltipProps) { return <LinkTooltip {...props} />; }
