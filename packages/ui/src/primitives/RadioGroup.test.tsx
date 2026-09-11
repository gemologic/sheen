import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { RadioGroup } from "./RadioGroup.tsx";

const options = [{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }];
describe("RadioGroup server contract", () => {
  it("renders named mutually exclusive native inputs in a labeled fieldset", () => {
    const html = renderToString(() => <RadioGroup label="Cadence" name="cadence" options={options} defaultValue="live" required error="Choose cadence" />);
    expect(html).toContain("<fieldset");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("<legend");
    expect(html.match(/name="cadence"/g)).toHaveLength(2);
    const inputs = html.match(/<input\b[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    expect(inputs.filter(input => /\schecked(?:[ =>])/.test(input))).toHaveLength(1);
    for (const input of inputs) {
      const labelId = input.match(/aria-labelledby="([^"]+)"/)?.[1];
      const inputId = input.match(/\sid="([^"]+)"/)?.[1];
      expect(labelId).toBeTruthy();
      expect(inputId).toBeTruthy();
      expect(html).toContain(`id="${labelId}"`);
      expect(html).toContain(`for="${inputId}"`);
    }
    expect(html).toContain('aria-invalid="true"');
    expect(html).not.toContain("aria-live");
  });
  it("supports controlled empty selection and validates identities", () => {
    const html = renderToString(() => <RadioGroup label="Cadence" name="cadence" options={options} value={null} defaultValue="live" />);
    expect((html.match(/<input\b[^>]*>/g) ?? []).some(input => /\schecked(?:[ =>])/.test(input))).toBe(false);
    expect(() => renderToString(() => <RadioGroup label="Bad" name="" options={options} />)).toThrow("name must be nonempty");
    expect(() => renderToString(() => <RadioGroup label="Bad" name="bad" options={[{ value: "", label: "Empty" }]} />)).toThrow("option values must be nonempty");
    expect(() => renderToString(() => <RadioGroup label="Bad" name="bad" options={[options[0]!, options[0]!]} />)).toThrow("duplicate option value");
  });
});
