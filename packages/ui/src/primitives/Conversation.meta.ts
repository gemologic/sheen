import { defineMeta } from "../metadata.ts";
import type { ConversationProps } from "./Conversation.tsx";

interface ExampleTurn { readonly id: string; readonly text: string }

export default defineMeta<ConversationProps<ExampleTurn>>({
  name: "Conversation", package: "@gemologic/sheen", category: "ai", summary: "A scrolling message log keyed by stable IDs that follows new content while the reader is at the end.",
  props: {
    ref: { description: "Native root reference. The log itself is the inner scroller." },
    items: { description: "Ordered turns with unique, nonempty, stable IDs. Replacing an item object for the same ID updates its accessor without recreating its node." },
    children: { description: "Renders one turn from a reactive item accessor; read fields inside JSX so updates stay fine-grained." },
    label: { description: "Accessible log name; defaults to the scoped conversation message.", control: { kind: "text" } },
    stickToBottom: { description: "Follow growth while scrolled to the end. Scrolling up stops following until the reader returns to the end or uses the jump action.", default: true, control: { kind: "boolean" } },
    jumpLabel: { description: "Jump action text; defaults to the scoped jumpToLatest message." },
  },
  tokens: ["--sheen-motion-stagger", "--sheen-duration-normal", "--sheen-ease-spring", "--sheen-motion-distance-sm", "--sheen-space-block-lg"],
  a11y: { role: "log", keyboard: ["Tab focuses the scrollable log", "Arrow keys, Page Up/Down, Home, and End scroll it", "Enter or Space activates the jump action"] },
  examples: [{ title: "Thread", code: '<div style={{ "block-size": "20rem" }}><Conversation items={[{ id: "1", text: "Hello" }, { id: "2", text: "Hi! How can I help?" }]}>{turn => <Message from={turn().id === "1" ? "user" : "assistant"}>{turn().text}</Message>}</Conversation></div>' }],
  guidance: { do: ["Give the conversation a bounded block size so it can scroll.", "Use StreamingText for the growing turn so the log does not announce every token."], dont: ["Do not key turns by index or request revision.", "Do not force-scroll a reader who scrolled up."] },
});
