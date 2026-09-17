import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { NumberText } from "./NumberText.tsx";

describe("NumberText", () => {
  it("preserves locale ordering, signs, grouping, and precision", () => {
    for (const locale of ["en-US", "de-DE", "ar-EG"]) {
      const format: Intl.NumberFormatOptions = { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 };
      const html = renderToString(() => <ThemeProvider locale={locale}><NumberText value={-1250.5} format={format} class="balance" /></ThemeProvider>);
      expect(html.replace(/<[^>]*>/gu, "")).toBe(new Intl.NumberFormat(locale, format).format(-1250.5));
      expect(html).not.toContain('data-number-part="integer"');
      expect(html).not.toContain('data-number-part="group"');
      expect(html).not.toContain('data-number-part="minusSign"');
      expect(html).toContain('class="sheen-number-text balance');
    }
  });

  it("formats fractional percentages and refuses ambiguous missing values", () => {
    const html = renderToString(() => <ThemeProvider><NumberText value={0.65} format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }} /></ThemeProvider>);
    expect(html.replace(/<[^>]*>/gu, "")).toBe("65.0%");
    expect(html).toContain('data-number-part="fraction">0</span>');
    expect(html).toContain('data-number-part="percentSign">%</span>');
    for (const value of [Number.NaN, Infinity, -Infinity]) expect(() => renderToString(() => <ThemeProvider><NumberText value={value} /></ThemeProvider>)).toThrow("finite value");
  });
});
