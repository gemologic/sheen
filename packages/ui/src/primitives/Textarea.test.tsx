import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Textarea } from "./Textarea.tsx";

describe("Textarea SSR", () => {
  it("reserves rows without browser measurement and preserves initial text", () => {
    const html = renderToString(() => <ThemeProvider><Textarea label="Notes" autoResize value={"First\nSecond"} /></ThemeProvider>);
    expect(html).toContain('rows="3"');
    expect(html).toContain('data-autoresize="true"');
    expect(html).toMatch(/<textarea\b[^>]*>\nFirst\nSecond<\/textarea>/);
    expect(html).not.toContain('value="First');
    expect(html).not.toContain("block-size:");
    expect(html.match(/<label\b/g)).toHaveLength(1);
  });
  it("forwards native states and composes validation associations", () => {
    const html = renderToString(() => <ThemeProvider><Textarea label="Notes" id="notes" rows={5} name="notes" disabled required error="Too long" aria-describedby="external" /></ThemeProvider>);
    expect(html).toContain('for="notes"');
    expect(html).toContain('id="notes"');
    expect(html).toContain('rows="5"');
    expect(html).toContain('name="notes"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="[^"]+ external"/);
    expect(html).toMatch(/\bdisabled(?:[ =>])/);
    expect(html).toMatch(/\brequired(?:[ =>])/);
  });
});
