import { defineMeta } from "../metadata.ts";
import type { NumberTextProps } from "./NumberText.tsx";

export default defineMeta<NumberTextProps>({
  name: "NumberText", package: "@gemologic/sheen", category: "typography",
  summary: "Typesets a finite number with locale-aware grouping, precision, and quieter fractional digits and units.",
  props: {
    value: { description: "Finite numeric value. Percent formats accept a fraction: 0.65 means 65 percent." },
    format: { description: "Intl.NumberFormat options for explicit precision, currency, units, or compact notation." },
    flash: { description: "Briefly tints the number with the market up or down color when the value changes. Never on first render; off under reduced motion." },
    tween: { description: "Counts from the previous value to the next on change. Server and first render show the final value; reduced motion jumps. Avoid inside live regions, which would announce intermediate values." },
    class: { description: "Class merged onto the native span; other native attributes and ref target that span." },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-color-market-up", "--sheen-color-market-down", "--sheen-duration-slow"],
  a11y: { role: "inline text", keyboard: [] },
  examples: [{ title: "Account balance", code: '<NumberText value={1250} format={{ style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }} />' }],
  guidance: { do: ["Use the same format for the same metric throughout the application.", "Name units and currency explicitly.", "Use raw values for sorting and calculations."], dont: ["Do not preformat or parse localized strings.", "Do not pass non-finite values; render an explicit missing-value state instead."] },
});
