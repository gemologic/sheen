import { Code } from "./Typography.tsx";
import type { CodeProps } from "./Typography.tsx";
import metadata from "./Code.meta.ts";

export const controls = metadata.props;
export default function CodeDemo(props: CodeProps) { return <Code {...props}>{props.children ?? "workspace.id"}</Code>; }
