import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "../theme/ThemeProvider.tsx";
import { NumberField } from "./NumberField.tsx";
import { RangeSlider, Slider } from "./Slider.tsx";

describe("numeric control server contracts", () => {
  it("renders a localized spinbutton, raw form value, and linked validation text", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{ increaseValue: "{label} erhöhen", decreaseValue: "{label} verringern" }}>
      <NumberField label="Budget" defaultValue={1234.5} formatOptions={{ style: "currency", currency: "EUR" }} name="budget" description="Monthly limit" error="Review amount" required />
    </ThemeScope></ThemeProvider>);
    expect(html).toContain('role="spinbutton"');
    expect(html).toContain("1.234,50");
    expect(html).toContain('name="budget"');
    expect(html).toContain('value="1234.5"');
    expect(html).toContain('aria-label="Budget erhöhen"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Monthly limit");
    expect(html).toContain("Review amount");
  });

  it("renders distinct single and range slider semantics with locale-aware value text", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{ minimumValue: "Minimum {label}", maximumValue: "Maximum {label}" }}>
      <Slider label="Threshold" defaultValue={25.5} step={0.5} />
      <RangeSlider label="Window" defaultValue={[20.5, 80.5]} step={0.5} minStepsBetweenThumbs={2} />
    </ThemeScope></ThemeProvider>);
    expect(html.match(/role="slider"/gu)).toHaveLength(3);
    expect(html).toContain('aria-label="Threshold"');
    expect(html).toContain('aria-label="Minimum Window"');
    expect(html).toContain('aria-label="Maximum Window"');
    expect(html).toContain('aria-valuetext="25,5"');
    expect(html).toContain("20,5 – 80,5");
  });

  it("rejects invalid numeric domains instead of coercing or sorting app state", () => {
    expect(() => renderToString(() => <ThemeProvider><NumberField label="Count" min={10} max={0} /></ThemeProvider>)).toThrow("increasing");
    expect(() => renderToString(() => <ThemeProvider><NumberField label="Count" value={Number.NaN} /></ThemeProvider>)).toThrow("finite");
    expect(() => renderToString(() => <ThemeProvider><Slider label="Level" step={0} /></ThemeProvider>)).toThrow("step");
    expect(() => renderToString(() => <ThemeProvider><RangeSlider label="Range" value={[80, 20]} /></ThemeProvider>)).toThrow("increasing");
    expect(() => renderToString(() => <ThemeProvider><RangeSlider label="Range" minStepsBetweenThumbs={0.5} /></ThemeProvider>)).toThrow("nonnegative integer");
  });
});
