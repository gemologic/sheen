import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Button } from "./Button.tsx";
import { Conversation } from "./Conversation.tsx";
import { Message } from "./Message.tsx";

const turns = [{ id: "a", from: "user", text: "Hello" }, { id: "b", from: "assistant", text: "Hi there" }] as const;

describe("Conversation and Message SSR", () => {
  it("renders complete turns inside a named, focusable log without entry animation", () => {
    const html = renderToString(() => <ThemeProvider><Conversation items={turns}>{turn => <Message from={turn().from} author={turn().from === "user" ? "You" : "Assistant"} timestamp="2026-11-15T09:30:00Z" timeLabel="9:30 AM" actions={<Button>Copy</Button>}>{turn().text}</Message>}</Conversation></ThemeProvider>);
    expect(html).toMatch(/role="log"[^>]*aria-label="Conversation"[^>]*tabindex="0"/);
    expect(html).toContain('data-id="a"');
    expect(html).toContain('data-id="b"');
    expect(html).not.toContain("data-entering");
    expect(html).not.toContain("sheen-conversation-jump");
    expect(html.indexOf(">Hello<")).toBeLessThan(html.indexOf(">Hi there<"));
    expect(html).toMatch(/<article[^>]*data-from="user"[^>]*aria-labelledby="([^"]+)"[\s\S]*?id="\1"[^>]*>You</);
    expect(html).toMatch(/<time[^>]*class="sheen-message-time"[^>]*datetime="2026-11-15T09:30:00Z">9:30 AM<\/time>/);
    expect(html.match(/>Copy</g)).toHaveLength(2);
  });
  it("omits empty message regions and rejects duplicate ids", () => {
    const html = renderToString(() => <ThemeProvider><Message from="system">Model changed</Message></ThemeProvider>);
    expect(html).toContain('data-from="system"');
    expect(html).not.toContain("sheen-message-header");
    expect(html).not.toContain("sheen-message-avatar");
    expect(html).not.toContain("sheen-message-actions");
    expect(html).not.toContain("aria-labelledby");
    expect(() => renderToString(() => <ThemeProvider><Conversation items={[{ id: "a" }, { id: "a" }]}>{() => <p>Turn</p>}</Conversation></ThemeProvider>)).toThrow(/duplicate/);
  });
});
