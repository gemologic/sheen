import { ActivityTimeline } from "./ActivityTimeline.tsx";
import type { ActivityTimelineProps } from "./ActivityTimeline.tsx";
import metadata from "./ActivityTimeline.meta.ts";

export const controls = metadata.props;
export default function ActivityTimelineDemo(props: ActivityTimelineProps = { label: "Deployment activity", items: [{ id: "approved", title: "Approved", state: "completed", timeLabel: "2:00 PM", timestamp: "2026-09-08T18:00:00Z" }, { id: "deploying", title: "Deploying", state: "current" }] }) { return <ActivityTimeline {...props} />; }
