import { describe, expect, it } from "vitest";
import { createNumberFormatCache } from "./number-format-cache.ts";

describe("scope number formatters", () => {
  it("shares equivalent option values while separating locales and provider lifetimes", () => {
    const format = createNumberFormatCache();
    const first = format("en-US", { style: "currency", currency: "USD" });
    expect(format("en-US", { currency: "USD", style: "currency" })).toBe(first);
    expect(format("de-DE", { currency: "USD", style: "currency" }).format(1250.5)).toBe(new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(1250.5));
    expect(createNumberFormatCache()("en-US", { style: "currency", currency: "USD" })).not.toBe(first);
  });

  it("reads changed options, inherited options and accessors without returning stale formats", () => {
    const format = createNumberFormatCache();
    const options = { maximumFractionDigits: 0 };
    expect(format("en-US", options).format(1.25)).toBe("1");
    options.maximumFractionDigits = 2;
    expect(format("en-US", options).format(1.25)).toBe("1.25");
    let precision = 0;
    const accessor = { get maximumFractionDigits() { return precision; } };
    expect(format("en-US", accessor).format(1.25)).toBe("1");
    precision = 2;
    expect(format("en-US", accessor).format(1.25)).toBe("1.25");
    class Options { get maximumFractionDigits(): number { return precision; } }
    expect(format("en-US", new Options()).format(1.25)).toBe("1.25");
    expect(() => format("en-US", { maximumFractionDigits: NaN })).toThrow(RangeError);
    expect(() => format("en-US", { style: "currency" })).toThrow(TypeError);
  });

  it("bounds retained instances while preserving formatting after eviction", () => {
    const format = createNumberFormatCache();
    const first = format("en-US", { maximumFractionDigits: 0 });
    for (let digits = 1; digits <= 40; digits++) format("en-US", { maximumFractionDigits: digits });
    expect(format("en-US", { maximumFractionDigits: 0 })).not.toBe(first);
    expect(format("en-US", { maximumFractionDigits: 0 }).format(1234.5)).toBe("1,235");
  });
});
