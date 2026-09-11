import { defineMeta } from "../../ui/src/metadata.ts";
import type { StatGroupProps } from "./chart-types.ts";

export default defineMeta<StatGroupProps>({
  name: "StatGroup", package: "@gemologic/sheen-charts", category: "data", summary: "Groups related tabular metrics under one accessible label.",
  props: {
    label: { description: "Required accessible label for the related metric set." },
    stats: { description: "One or more stat records rendered with the same validation as Stat." },
    class: { description: "Optional class appended to the component root." },
  },
  tokens: ["--sheen-color-border", "--sheen-color-bg-raised", "--sheen-color-fg", "--sheen-color-fg-muted"],
  a11y: { role: "group containing term and definition pairs", keyboard: [] },
  examples: [{ title: "Service health", setup: 'const health = [{ label: "Requests", value: "18.2k", trend: "up", trendLabel: "8 percent higher" }, { label: "p99", value: "43 ms", trend: "flat", trendLabel: "unchanged" }] satisfies StatGroupProps["stats"];', code: '<StatGroup label="Service health" stats={health} />', imports: 'import type { StatGroupProps } from "@gemologic/sheen-charts";' }],
  guidance: { do: ["Group metrics that users compare together."], dont: ["Do not put unrelated dashboard values under a vague label."] },
});
