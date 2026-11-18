import { PromptInput } from "./PromptInput.tsx";
import type { PromptInputProps } from "./PromptInput.tsx";
import metadata from "./PromptInput.meta.ts";

export const controls = metadata.props;
export default function PromptInputDemo(props: Partial<PromptInputProps>) { return <PromptInput placeholder="Ask anything" {...props} onSubmit={value => props.onSubmit?.(value)} />; }
