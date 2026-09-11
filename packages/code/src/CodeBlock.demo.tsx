import { CodeBlock } from "./CodeBlock.tsx";
import type { CodeBlockProps } from "./CodeBlock.tsx";
import metadata from "./CodeBlock.meta.ts";

export const controls = metadata.props;
export default function CodeBlockDemo(props: CodeBlockProps) { return <CodeBlock {...props} />; }
