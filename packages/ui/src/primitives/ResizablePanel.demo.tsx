import { Resizable, ResizableHandle, ResizablePanel } from "./Resizable.tsx";
import type { ResizablePanelProps } from "./Resizable.tsx";
import metadata from "./ResizablePanel.meta.ts";

export const controls = metadata.props;
export default function ResizablePanelDemo(props: ResizablePanelProps) {
  return <Resizable><ResizablePanel {...props} /><ResizableHandle index={0} label="Resize first and second panel" /><ResizablePanel index={1}>Second</ResizablePanel></Resizable>;
}
