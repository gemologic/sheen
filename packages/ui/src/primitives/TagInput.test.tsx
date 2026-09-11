import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { TagInput } from "./TagInput.tsx";

describe("TagInput server contract", () => {
  it("renders complete labeled input, ordered tags, and a selected native form projection", () => {
    const html = renderToString(() => <ThemeProvider hydration="cookie"><TagInput label="Labels" name="labels" defaultValue={["frontend", "urgent"]} description="Issue labels" required /></ThemeProvider>);
    expect(html).toContain('aria-label="Tags"');
    expect(html).toContain('name="labels"');
    expect(html).toContain("frontend");
    expect(html).toContain("urgent");
    expect(html.indexOf("frontend")).toBeLessThan(html.indexOf("urgent"));
    expect(html.match(/<option\b[^>]*selected/g)).toHaveLength(2);
    expect(html).toContain("Issue labels");
    expect(html).toContain("required");
  });

  it("rejects empty and duplicate owner values before rendering", () => {
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><TagInput label="Labels" value={[""]} /></ThemeProvider>)).toThrow("values must be nonempty");
    expect(() => renderToString(() => <ThemeProvider hydration="cookie"><TagInput label="Labels" value={["same", "same"]} /></ThemeProvider>)).toThrow('duplicate value "same"');
  });
});
