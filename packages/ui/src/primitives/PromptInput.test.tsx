import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Button } from "./Button.tsx";
import { PromptInput } from "./PromptInput.tsx";

describe("PromptInput SSR", () => {
  it("renders the draft, a named textarea, and an unavailable send action for an empty draft", () => {
    const empty = renderToString(() => <ThemeProvider><PromptInput onSubmit={() => {}} /></ThemeProvider>);
    expect(empty).toMatch(/<form[^>]*class="sheen-prompt-input ?"[^>]*data-status="idle"/);
    expect(empty).toContain('aria-label="Message"');
    expect(empty).toContain('rows="1"');
    expect(empty).toMatch(/<button[^>]*type="submit"[^>]*aria-disabled="true"[^>]*aria-label="Send message"[^>]*data-action="send"/);
    const drafted = renderToString(() => <ThemeProvider><PromptInput onSubmit={() => {}} value={"First\nSecond"} name="prompt" maxRows={4} /></ThemeProvider>);
    expect(drafted).toMatch(/<textarea\b[^>]*>\nFirst\nSecond<\/textarea>/);
    expect(drafted).toContain('name="prompt"');
    expect(drafted).toContain("--sheen-prompt-input-max-rows:4");
    expect(drafted).not.toMatch(/data-action="send"[^>]*aria-disabled/);
    expect(drafted).not.toMatch(/aria-disabled="true"[^>]*data-action="send"/);
  });
  it("renders the stop action while streaming and the slots once", () => {
    const html = renderToString(() => <ThemeProvider><PromptInput onSubmit={() => {}} onStop={() => {}} status="streaming" value="Next" leading={<Button>Attach</Button>} trailing={<Button>Model</Button>} /></ThemeProvider>);
    expect(html).toContain('data-status="streaming"');
    expect(html).toMatch(/<button[^>]*type="button"[^>]*aria-label="Stop response"[^>]*data-action="stop"/);
    expect(html).not.toMatch(/data-action="stop"[^>]*aria-disabled/);
    expect(html.match(/>Attach</g)).toHaveLength(1);
    expect(html.match(/>Model</g)).toHaveLength(1);
    const unstoppable = renderToString(() => <ThemeProvider><PromptInput onSubmit={() => {}} status="streaming" /></ThemeProvider>);
    expect(unstoppable).toMatch(/aria-disabled="true"[^>]*aria-label="Stop response"/);
  });
  it("rejects a non-positive maxRows", () => {
    expect(() => renderToString(() => <ThemeProvider><PromptInput onSubmit={() => {}} maxRows={0} /></ThemeProvider>)).toThrow(/maxRows/);
  });
});
