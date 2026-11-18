import { Avatar, Button, Conversation, Heading, Message, PromptInput, Row, Stack, StreamingText, Text } from "@gemologic/sheen";
import type { PromptInputStatus } from "@gemologic/sheen";
import { createSignal } from "solid-js";

interface Turn {
  readonly id: string;
  readonly from: "user" | "assistant" | "system";
  readonly text: string;
  readonly streaming: boolean;
}

const reply = "Three deploys shipped yesterday. The billing worker was rolled back after a failed health check.\n\nIt is healthy again on the previous release, and the fix is queued for review.";
const tokens = reply.match(/\S+\s*|\s+/gu) ?? [];

const history: readonly Turn[] = Array.from({ length: 12 }, (_, index) => ({
  id: `seed-${index}`,
  from: index % 2 === 0 ? "user" : "assistant",
  text: index % 2 === 0 ? `Question ${index / 2 + 1}: what changed in the release?` : `Answer ${(index + 1) / 2}: a handful of fixes landed, including retry backoff for webhooks and a quieter audit log.`,
  streaming: false,
}));

export default function AiChatRoute() {
  const [turns, setTurns] = createSignal<readonly Turn[]>(history);
  const [draft, setDraft] = createSignal("");
  const [status, setStatus] = createSignal<PromptInputStatus>("idle");
  const [submissions, setSubmissions] = createSignal<readonly string[]>([]);
  const [stops, setStops] = createSignal(0);
  let next = 0;
  let position = 0;
  const updateStreaming = (update: (turn: Turn) => Turn) => setTurns(current => current.map(turn => turn.streaming ? update(turn) : turn));
  const finish = () => { updateStreaming(turn => ({ ...turn, streaming: false })); setStatus("idle"); };
  const submit = (value: string) => {
    setSubmissions(current => [...current, value]);
    setDraft("");
    next += 1;
    position = 0;
    setTurns(current => [...current, { id: `user-${next}`, from: "user", text: value, streaming: false }, { id: `assistant-${next}`, from: "assistant", text: "", streaming: true }]);
    setStatus("streaming");
  };
  const appendToken = () => {
    const token = tokens[position];
    if (token === undefined) { finish(); return; }
    position += 1;
    updateStreaming(turn => ({ ...turn, text: turn.text + token }));
  };
  const appendHistory = () => {
    next += 1;
    setTurns(current => [...current, { id: `note-${next}`, from: "system", text: "Model switched to the fast tier.", streaming: false }, { id: `follow-${next}`, from: "assistant", text: "Ready when you are.", streaming: false }]);
  };
  return <main><Stack gap="md">
    <Heading level={1}>AI chat</Heading>
    <Text>Keyed message log, streaming text, and a send/stop composer. Token and history controls drive the fixture deterministically.</Text>
    <Row gap="sm" wrap>
      <Button onClick={appendToken}>Append token</Button>
      <Button onClick={finish}>Finish response</Button>
      <Button onClick={appendHistory}>Append history</Button>
    </Row>
    <div style={{ "block-size": "24rem", "border": "1px solid var(--sheen-color-border)", "border-radius": "var(--sheen-surface-radius)" }}>
      <Conversation items={turns()} label="Release assistant">{turn =>
        <Message from={turn().from} author={turn().from === "user" ? "You" : turn().from === "assistant" ? "Assistant" : undefined}
          avatar={turn().from === "system" ? undefined : <Avatar label={turn().from === "user" ? "You" : "Assistant"} size="sm" />}
          actions={turn().from === "assistant" && !turn().streaming ? <Button size="xs">Copy</Button> : undefined}>
          {turn().from === "assistant" ? <StreamingText text={turn().text} streaming={turn().streaming} /> : turn().text}
        </Message>
      }</Conversation>
    </div>
    <PromptInput value={draft()} onValueChange={setDraft} status={status()} onSubmit={submit} onStop={() => { setStops(count => count + 1); finish(); }}
      placeholder="Ask about the release" label="Ask the release assistant" maxRows={6} leading={<Button size="sm">Attach</Button>} />
    <output aria-label="Submissions">{JSON.stringify(submissions())}</output>
    <output aria-label="Stops">{stops()}</output>
    <output aria-label="Draft">{JSON.stringify(draft())}</output>
  </Stack></main>;
}
