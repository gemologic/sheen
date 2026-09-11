import { Button, Row, Stack, useTheme } from "@gemologic/sheen";
import { CodeBlock } from "@gemologic/sheen-code";
import type { HighlightedCode } from "@gemologic/sheen-code";
import { createMemo, createSignal } from "solid-js";

const sources: readonly string[] = [
  "const stable = true;\nconsole.log(stable);",
  "const stable = true;\nconsole.info(\"accepted refresh\", stable);",
];

function highlightedCode(code: string): HighlightedCode {
  const second = code.includes("console.info")
    ? [{ content: "console.info", lightColor: "#8250df", darkColor: "#d2a8ff" }, { content: '("accepted refresh", stable);', lightColor: "#24292f", darkColor: "#c9d1d9" }]
    : [{ content: "console.log", lightColor: "#8250df", darkColor: "#d2a8ff" }, { content: "(stable);", lightColor: "#24292f", darkColor: "#c9d1d9" }];
  return {
    code,
    language: "ts",
    lines: [
      { tokens: [{ content: "const", lightColor: "#cf222e", darkColor: "#ff7b72" }, { content: " stable = ", lightColor: "#24292f", darkColor: "#c9d1d9" }, { content: "true", lightColor: "#0550ae", darkColor: "#79c0ff" }, { content: ";", lightColor: "#24292f", darkColor: "#c9d1d9" }] },
      { tokens: second },
    ],
  };
}

export default function CodeBlockRoute() {
  const theme = useTheme();
  const [revision, setRevision] = createSignal(0);
  const [wrapped, setWrapped] = createSignal(false);
  const code = createMemo(() => sources[revision() % sources.length] ?? "const stable = true;\nconsole.log(stable);");
  const highlighted = createMemo(() => highlightedCode(code()));
  return <main><Stack>
    <Row>
      <Button onClick={() => theme.setMode(theme.resolvedMode() === "dark" ? "light" : "dark")}>Toggle mode</Button>
      <Button onClick={() => setRevision(value => value + 1)}>Refresh code</Button>
    </Row>
    <CodeBlock code={code()} language="ts" filename="stable.ts" label="Stable TypeScript example" highlighted={highlighted()}
      highlightedLines={[2]} lineNumbers showLanguage copyable wrapToggle wrapped={wrapped()} onWrappedChange={setWrapped} />
  </Stack></main>;
}
