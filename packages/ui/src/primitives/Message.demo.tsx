import { Message } from "./Message.tsx";
import type { MessageProps } from "./Message.tsx";
import metadata from "./Message.meta.ts";

export const controls = metadata.props;
export default function MessageDemo(props: Partial<MessageProps>) { return <Message author="Assistant" timeLabel="9:30 AM" {...props} from={props.from ?? "assistant"}>{props.children ?? "Here is the summary you asked for."}</Message>; }
