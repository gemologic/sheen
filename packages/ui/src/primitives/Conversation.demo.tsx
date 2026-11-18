import { Conversation } from "./Conversation.tsx";
import type { ConversationProps } from "./Conversation.tsx";
import { Message } from "./Message.tsx";
import metadata from "./Conversation.meta.ts";

interface DemoTurn { readonly id: string; readonly from: "user" | "assistant"; readonly text: string }
const turns: readonly DemoTurn[] = [
  { id: "1", from: "user", text: "Summarize yesterday's deploys." },
  { id: "2", from: "assistant", text: "Three deploys shipped. One was rolled back after a failed health check." },
  { id: "3", from: "user", text: "Which service was rolled back?" },
  { id: "4", from: "assistant", text: "The billing worker. It is healthy again on the previous release." },
];

export const controls = metadata.props;
export default function ConversationDemo(props: Partial<ConversationProps<DemoTurn>>) {
  return <div style={{ "block-size": "16rem" }}><Conversation {...props} items={props.items ?? turns}>{turn => <Message from={turn().from}>{turn().text}</Message>}</Conversation></div>;
}
