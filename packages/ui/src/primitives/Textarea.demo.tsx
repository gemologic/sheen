import { Textarea } from "./Textarea.tsx";
import type { TextareaProps } from "./Textarea.tsx";
import metadata from "./Textarea.meta.ts";

export const controls = metadata.props;
export default function TextareaDemo(props: TextareaProps) { return <Textarea {...props} />; }
