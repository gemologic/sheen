import { Resizable, ResizableHandle, ResizablePanel } from "./Resizable.tsx";
import type { ResizableProps } from "./Resizable.tsx";
import metadata from "./Resizable.meta.ts";

export const controls = metadata.props;
export default function ResizableDemo(props: ResizableProps) { return <Resizable {...props} />; }

export function DefaultResizableDemo() {
  return <Resizable defaultSizes={[0.35, 0.65]}><ResizablePanel index={0}>Files</ResizablePanel><ResizableHandle index={0} label="Resize files and preview" /><ResizablePanel index={1}>Preview</ResizablePanel></Resizable>;
}
