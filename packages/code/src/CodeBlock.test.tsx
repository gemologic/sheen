import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen/core";
import { CodeBlock } from "./CodeBlock.tsx";
import { highlightCode } from "./highlight.ts";

describe("CodeBlock", () => {
  it("renders deterministic highlighted SSR without injecting source as markup", async () => {
    const code = 'const label = "<safe>";';
    const highlighted = await highlightCode({ code, language: "ts" });
    const html = renderToString(() => <ThemeProvider><CodeBlock code={code} language="ts" label="Example" filename="safe.ts" highlighted={highlighted} highlightedLines={[1]} lineNumbers showLanguage copyable wrapToggle /></ThemeProvider>);
    expect(html).toContain("sheen-code-block-token");
    expect(html).toContain("--sheen-code-token-light:#");
    expect(html).toContain("--sheen-code-token-dark:#");
    expect(html).toContain("&lt;safe>");
    expect(html).not.toContain("<safe>");
    expect(html).toContain('data-line="1"');
    expect(html).toContain('data-highlighted="true"');
    expect(html).toContain("Highlighted lines: 1");
    expect(html).toContain("safe.ts");
    expect(html).toContain("Copy code");
    expect(html).toContain("Wrap code");
  });

  it("renders complete numbered plain source when highlighted output is unavailable", () => {
    const html = renderToString(() => <ThemeProvider><CodeBlock code={"one\ntwo\n"} language="text" lineNumbers defaultWrapped /></ThemeProvider>);
    expect(html).toContain(">one</span>");
    expect(html).toContain(">two</span>");
    expect(html).toContain('aria-label="text code"');
    expect(html).toContain('data-line="3"');
    expect(html).toContain('data-wrap="true"');
  });

  it("rejects stale highlighted output, invalid source lines, ranges, and empty language names", async () => {
    const highlighted = await highlightCode({ code: "const a = 1", language: "ts" });
    expect(() => renderToString(() => <ThemeProvider><CodeBlock code="const b = 2" language="ts" highlighted={highlighted} /></ThemeProvider>)).toThrow("must match");
    expect(() => renderToString(() => <ThemeProvider><CodeBlock code={"one\ntwo"} language="text" highlighted={{ code: "one\ntwo", language: "text", lines: [{ tokens: [{ content: "one two" }] }] }} /></ThemeProvider>)).toThrow("preserve source lines");
    expect(() => renderToString(() => <ThemeProvider><CodeBlock code="one" language="text" highlighted={{ code: "one", language: "text", lines: [{ tokens: [{ content: "two" }] }] }} /></ThemeProvider>)).toThrow("preserve source text");
    expect(() => renderToString(() => <ThemeProvider><CodeBlock code={"one\ntwo"} language="text" highlightedLines={[{ start: 2, end: 3 }]} /></ThemeProvider>)).toThrow("must be within");
    expect(() => renderToString(() => <ThemeProvider><CodeBlock code="value" language=" " /></ThemeProvider>)).toThrow("nonempty");
  });
});
