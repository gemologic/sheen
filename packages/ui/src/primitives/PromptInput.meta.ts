import { defineMeta } from "../metadata.ts";
import type { PromptInputProps } from "./PromptInput.tsx";

export default defineMeta<PromptInputProps>({
  name: "PromptInput", package: "@gemologic/sheen", category: "ai", summary: "A chat composer whose textarea grows to a bounded height and whose single action sends the draft or stops a streaming response.",
  props: {
    ref: { description: "Native form reference." },
    value: { description: "Controlled draft. The owner clears it after submit; omit for uncontrolled ownership.", control: { kind: "text" } },
    defaultValue: { description: "Initial uncontrolled draft. Uncontrolled drafts clear after each submit." },
    onValueChange: { description: "Receives every draft proposal, including IME composition text and text typed before hydration." },
    onSubmit: { description: "Receives the untrimmed draft from Enter or the send action. Whitespace-only drafts, open IME compositions, and streaming never submit." },
    onStop: { description: "Called by the stop action while streaming. Without it the stop action is unavailable." },
    status: { description: "Idle shows the send action; streaming turns the same button node into a stop action and holds Enter.", default: "idle", control: { kind: "select", values: ["idle", "streaming"] } },
    label: { description: "Accessible textarea name; defaults to the scoped promptInput message.", control: { kind: "text" } },
    placeholder: { description: "Visible hint inside the empty textarea. It does not replace the accessible label.", control: { kind: "text" } },
    name: { description: "Native textarea name for FormData." },
    disabled: { description: "Disables the textarea and action natively.", default: false, control: { kind: "boolean" } },
    maxRows: { description: "Positive integer row count where growth stops and the textarea scrolls.", default: 8 },
    leading: { description: "Toolbar content before the action area, such as an attachment button." },
    trailing: { description: "Toolbar content placed immediately before the send/stop action." },
    submitLabel: { description: "Send action accessible name; defaults to the scoped sendMessage message." },
    stopLabel: { description: "Stop action accessible name; defaults to the scoped stopResponse message." },
    textareaRef: { description: "Native textarea reference for focus management." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-border-control", "--sheen-text-body-leading", "--sheen-color-focus-ring", "--sheen-surface-radius"],
  a11y: { role: "form containing a multiline textbox and a send/stop button", keyboard: ["Enter submits", "Shift+Enter inserts a newline", "Enter confirming an IME candidate does not submit", "Tab moves to toolbar actions", "Enter or Space activates send/stop"] },
  examples: [
    { title: "Chat composer", setup: 'const [status, setStatus] = createSignal<"idle" | "streaming">("idle");', imports: 'import { createSignal } from "solid-js";', code: '<PromptInput placeholder="Ask anything" status={status()} onSubmit={() => setStatus("streaming")} onStop={() => setStatus("idle")} />' },
    { title: "Attachment slot", code: '<PromptInput onSubmit={() => {}} leading={<Button size="sm">Attach</Button>} />' },
  ],
  guidance: { do: ["Keep the draft editable while a response streams; only submission waits.", "Return focus decisions to the app; the action keeps focus through send/stop changes."], dont: ["Do not submit on Enter during IME composition.", "Do not clear a controlled draft before the app accepts the submission."] },
});
