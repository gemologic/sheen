import { JSONViewer } from "./JSONViewer.tsx";
import type { JSONViewerProps } from "./JSONViewer.tsx";
import metadata from "./JSONViewer.meta.ts";

export const controls = metadata.props;
export default function JSONViewerDemo(props: JSONViewerProps = { label: "API response", value: { status: "ready", records: [{ id: "one", amount: 42 }] } }) { return <JSONViewer {...props} />; }
