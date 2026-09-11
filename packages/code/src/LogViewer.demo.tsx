import { LogViewer } from "./LogViewer.tsx";
import type { LogViewerProps } from "./LogViewer.tsx";
import metadata from "./LogViewer.meta.ts";

export const controls = metadata.props;
export default function LogViewerDemo(props: LogViewerProps = { label: "Deployment logs", entries: [{ id: "one", timestamp: "2026-09-09T12:00:00Z", level: "info", message: "Deployment started" }] }) { return <LogViewer {...props} />; }
