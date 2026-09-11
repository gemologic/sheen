import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { SegmentedControl } from "./SegmentedControl.tsx";

const options = [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month", disabled: true }];

describe("SegmentedControl server contract", () => {
  it("renders one labeled native radio group with a single submitted selection", () => {
    const html = renderToString(() => <SegmentedControl label="Period" name="period" options={options} defaultValue="week" description="Choose a reporting period" required />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('<legend');
    expect(html.match(/name="period"/gu)).toHaveLength(3);
    expect((html.match(/<input\b[^>]*>/gu) ?? []).filter(input => /\schecked(?:[ =>])/u.test(input))).toHaveLength(1);
    expect(html).toContain('aria-orientation="horizontal"');
    expect(html).toContain('data-overflow="scroll"');
  });

  it("supports controlled empty state and rejects ambiguous option identities", () => {
    const html = renderToString(() => <SegmentedControl label="Period" name="period" options={options} value={null} defaultValue="week" />);
    expect((html.match(/<input\b[^>]*>/gu) ?? []).some(input => /\schecked(?:[ =>])/u.test(input))).toBe(false);
    expect(() => renderToString(() => <SegmentedControl label="Bad" name="" options={options} />)).toThrow("name must be nonempty");
    expect(() => renderToString(() => <SegmentedControl label="Bad" name="bad" options={[{ value: "", label: "Empty" }]} />)).toThrow("values must be nonempty");
    expect(() => renderToString(() => <SegmentedControl label="Bad" name="bad" options={[{ value: "same", label: "One" }, { value: "same", label: "Two" }]} />)).toThrow("duplicate option value");
  });
});
