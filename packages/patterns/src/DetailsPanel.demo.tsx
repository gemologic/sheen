import { DetailsPanel } from "./DetailsPanel.tsx";
import type { DetailsPanelProps } from "./DetailsPanel.tsx";
import metadata from "./DetailsPanel.meta.ts";
export const controls = metadata.props;
export default function DetailsPanelDemo(props: DetailsPanelProps) { return <DetailsPanel {...props} />; }
