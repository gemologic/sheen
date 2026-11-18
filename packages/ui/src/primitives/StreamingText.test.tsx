import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { StreamingText } from "./StreamingText.tsx";

describe("StreamingText SSR", () => {
  it("renders paragraphs as escaped plain text with a busy marker while streaming", () => {
    const html = renderToString(() => <ThemeProvider><StreamingText text={"First line\nstill first\n\n<b>Second</b>"} streaming /></ThemeProvider>);
    expect(html).toContain('data-streaming="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toMatch(/<p[^>]*>First line\nstill first<\/p>/);
    expect(html).toMatch(/<p[^>]*>&lt;b>Second&lt;\/b><\/p>/);
    expect(html).toMatch(/role="status"><\/span>/);
  });
  it("renders settled text without a caret, busy state, or initial announcement", () => {
    const html = renderToString(() => <ThemeProvider><StreamingText text="Done" /></ThemeProvider>);
    expect(html).not.toContain("data-streaming");
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("Response complete");
  });
});
