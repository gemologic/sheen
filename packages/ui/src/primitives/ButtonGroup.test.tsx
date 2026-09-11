import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ButtonGroup } from "./ButtonGroup.tsx";
import { Button } from "./Button.tsx";

describe("ButtonGroup SSR", () => {
  it("groups native actions without adding a tab stop or changing disabled ownership", () => {
    const html = renderToString(() => <ButtonGroup label="Actions" class="custom" id="actions"><Button>Save</Button><Button disabled>Discard</Button></ButtonGroup>);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Actions"');
    expect(html).toContain('data-orientation="horizontal"');
    expect(html).toContain('id="actions"');
    expect(html).toContain("sheen-button-group custom");
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html.match(/ disabled/g)).toHaveLength(1);
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain("aria-orientation");
  });
  it("supports vertical layout and rejects empty group names", () => {
    expect(renderToString(() => <ButtonGroup label="Actions" orientation="vertical" />)).toContain('data-orientation="vertical"');
    expect(() => renderToString(() => <ButtonGroup label=" " />)).toThrow("nonempty accessible label");
  });
});
