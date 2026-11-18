import { defineMeta } from "../metadata.ts";
import type { ProseProps } from "./Typography.tsx";

export default defineMeta<ProseProps>({
  name: "Prose", package: "@gemologic/sheen", category: "typography",
  summary: "Long-form reading typography for rendered Markdown, help articles, changelogs, and legal text. Styles native descendants (headings, paragraphs, lists, quotes, code, tables, images) with a readable measure.",
  props: {},
  tokens: ["--sheen-text-body-size", "--sheen-text-body-leading", "--sheen-text-h1-size", "--sheen-text-h2-size", "--sheen-text-h3-size", "--sheen-color-accent-fg", "--sheen-color-bg-inset", "--sheen-font-mono"],
  a11y: { role: "none; descendants keep native semantics", keyboard: [] },
  examples: [{ title: "Rendered article", code: "<Prose>\n  <h2>Rotate an API key</h2>\n  <p>Create the new key before revoking the old one.</p>\n  <ol><li>Open <strong>Settings → API keys</strong>.</li><li>Choose <em>Rotate</em>.</li></ol>\n</Prose>" }],
  guidance: {
    do: ["Sanitize untrusted HTML before rendering it inside Prose.", "Keep one Prose region per article so the measure stays readable."],
    dont: ["Do not wrap application chrome, forms, or tables of records in Prose; use components with their own styling."],
  },
});
