import { describe, expect, it } from "vitest";
import { highlightCode } from "./highlight.ts";
import { json, typescript } from "./languages.ts";

describe("highlightCode", () => {
  it("highlights a declared language by alias with both theme variants and preserved source", async () => {
    const code = "const ready: boolean = true;\nexport { ready };";
    const highlighted = await highlightCode({ code, language: "ts", languages: [json, typescript] });
    expect(highlighted.language).toBe("ts");
    expect(highlighted.lines.map(line => line.tokens.map(token => token.content).join("")).join("\n")).toBe(code);
    const keyword = highlighted.lines[0]?.tokens.find(token => token.content === "const");
    expect(keyword?.lightColor).toMatch(/^#[0-9a-f]{6}/iu);
    expect(keyword?.darkColor).toMatch(/^#[0-9a-f]{6}/iu);
    expect(keyword?.lightColor).not.toBe(keyword?.darkColor);
  });

  it("rejects languages that were not declared", async () => {
    // @ts-expect-error json is not in the declared languages.
    await expect(highlightCode({ code: "{}", language: "json", languages: [typescript] })).rejects.toThrow('language "json" is not one of the declared languages');
  });

  it("rejects aborted work instead of returning a stale result", async () => {
    const controller = new AbortController();
    const pending = highlightCode({ code: "{}", language: "json", languages: [json], signal: controller.signal });
    controller.abort(new Error("superseded"));
    await expect(pending).rejects.toThrow("superseded");
  });
});
