import { DiffViewer } from "./DiffViewer.tsx";
import type { DiffViewerProps } from "./DiffViewer.tsx";
import metadata from "./DiffViewer.meta.ts";

export const controls = metadata.props;
export default function DiffViewerDemo(props: DiffViewerProps = { oldText: "port = 80\nenabled = false", newText: "port = 443\nenabled = true", label: "Configuration changes" }) { return <DiffViewer {...props} />; }
