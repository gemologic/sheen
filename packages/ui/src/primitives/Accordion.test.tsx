import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Accordion, AccordionItem } from "./Accordion.tsx";

describe("Accordion SSR", () => {
  it("renders native heading buttons with persistent panel associations", () => {
    const html = renderToString(() => <Accordion defaultValue={["general"]}>
      <AccordionItem id="general" value="general" label="General" headingLevel={2}><input value="Draft" /></AccordionItem>
      <AccordionItem id="advanced" value="advanced" label="Advanced" disabled>Hidden content</AccordionItem>
    </Accordion>);
    expect(html).toContain("<h2");
    expect(html).toContain('aria-controls="general-content"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="advanced-content"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Hidden content");
    expect(html).toContain("disabled");
  });
  it("requires an Accordion owner", () => {
    expect(() => renderToString(() => <AccordionItem value="orphan" label="Orphan" />)).toThrow("Accordion.Root");
  });
  it("rejects duplicate item identities and invalid single selection", () => {
    expect(() => renderToString(() => <Accordion><AccordionItem value="same" label="First" /><AccordionItem value="same" label="Second" /></Accordion>)).toThrow("duplicate item value");
    expect(() => renderToString(() => <Accordion value={["first", "second"]} />)).toThrow("at most one");
  });
});
