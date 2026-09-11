import { TagInput } from "./TagInput.tsx";
import type { TagInputProps } from "./TagInput.tsx";
import metadata from "./TagInput.meta.ts";

export const controls = metadata.props;
export default function TagInputDemo(props: TagInputProps = { label: "Labels", name: "labels", defaultValue: ["frontend", "urgent"], description: "Press Enter to add a label." }) { return <TagInput {...props} />; }
