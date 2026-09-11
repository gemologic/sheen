import { Resizable, ResizableHandle, ResizablePanel } from "./Resizable.tsx";
import type { ResizableHandleProps } from "./Resizable.tsx";
import metadata from "./ResizableHandle.meta.ts";

export const controls = metadata.props;
export default function ResizableHandleDemo(props: ResizableHandleProps) {
  return <Resizable><ResizablePanel index={0}>First</ResizablePanel><ResizableHandle {...props} /><ResizablePanel index={1}>Second</ResizablePanel></Resizable>;
}
