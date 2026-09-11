import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ScrollArea } from "./ScrollArea.tsx";

describe("ScrollArea SSR", () => {
  it("renders a named native viewport with keyboard access and retained content", () => {
    const html = renderToString(() => <ScrollArea label="Activity" orientation="both"><input value="Draft" /></ScrollArea>);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Activity"');
    expect(html).toMatch(/tabindex="0"/i);
    expect(html).toContain('data-orientation="both"');
    expect(html).toContain('value="Draft"');
    expect(html).not.toContain("data-scrolling");
  });
  it("requires a nonempty accessible name", () => {
    expect(() => renderToString(() => <ScrollArea label=" " />)).toThrow("accessible label");
  });
});
