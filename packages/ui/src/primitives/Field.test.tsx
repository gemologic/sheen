import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Field } from "./Field.tsx";
import { Input } from "./Input.tsx";

describe("Field associations", () => {
  it("links the label, instructions, and error to the same control", () => {
    const html = renderToString(() => <Field label="Notes" controlId="notes" description="Team-visible" error="Required value" required>{control => <textarea {...control} />}</Field>);
    expect(html).toContain('for="notes"');
    expect(html).toContain('id="notes"');
    expect(html).toContain('aria-invalid="true"');
    const ids = html.match(/aria-describedby="([^"]+)"/)?.[1]?.split(" ") ?? [];
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
    expect(html).toMatch(/\brequired(?:[ =>])/);
    expect(html).not.toContain("aria-live");
  });
  it("composes Input without duplicate labels and retains consumer associations", () => {
    const html = renderToString(() => <Input label="Account" id="account" description="Account name" error="Name unavailable" aria-describedby="external" disabled name="account" />);
    expect(html.match(/<label\b/g)).toHaveLength(1);
    expect(html).toContain('for="account"');
    expect(html).toMatch(/aria-describedby="[^"]+ external"/);
    expect(html).toContain('name="account"');
    expect(html).toMatch(/\bdisabled(?:[ =>])/);
  });
});
