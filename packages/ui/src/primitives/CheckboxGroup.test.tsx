import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { CheckboxGroup } from "./CheckboxGroup.tsx";

const options = [{ value: "email", label: "Email" }, { value: "desktop", label: "Desktop", disabled: true }];

describe("CheckboxGroup server contract", () => {
  it("renders a native legend and shared named controls with group descriptions", () => {
    const html = renderToString(() => <CheckboxGroup label="Channels" options={options} name="channels" defaultValue={["email"]} description="Choose delivery channels" error="Choose another channel" />);
    expect(html).toContain("<fieldset");
    expect(html).toMatch(/<legend[^>]*>Channels<\/legend>/);
    expect(html.match(/name="channels"/g)).toHaveLength(2);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain("aria-live");
  });
  it("rejects duplicate identities and respects controlled empty selection", () => {
    expect(() => renderToString(() => <CheckboxGroup label="Duplicate" options={[options[0]!, options[0]!]} />)).toThrow('duplicate option value "email"');
    const html = renderToString(() => <CheckboxGroup label="Channels" options={options} value={[]} defaultValue={["email"]} disabled />);
    const inputs = html.match(/<input\b[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input).not.toMatch(/\schecked(?:[ =>])/);
      expect(input).toMatch(/\sdisabled(?:[ =>])/);
      expect(input).toContain('name=""');
    }
  });
});
