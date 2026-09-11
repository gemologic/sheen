export default Object.freeze({
  name: "DynamicIcon", package: "@gemologic/sheen-icons", category: "icons",
  summary: "An explicit full-registry icon lookup for names that are genuinely known only at runtime.",
  props: {
    name: { description: "Runtime semantic name, validated against the complete registry.", control: { kind: "text" } },
    size: { description: "Token-sized icon dimensions.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } },
    tone: { description: "Muted at rest or inherited from an interactive parent.", default: "muted", control: { kind: "select", values: ["muted", "inherit"] } },
    decorative: { description: "Decorative by default; set false together with a nonempty label for meaningful imagery.", default: true, control: { kind: "boolean" } },
    label: { description: "Required accessible name when decorative is false.", control: { kind: "text" } },
  },
  tokens: ["--sheen-icon-size-sm", "--sheen-icon-size-md", "--sheen-icon-size-lg", "--sheen-color-fg-muted"],
  a11y: { role: "img when meaningful; hidden when decorative", keyboard: [] },
  examples: [{ title: "Runtime lookup", code: '<DynamicIcon name="search" decorative={false} label="Search" />' }],
  guidance: { do: ["Use only when a literal or per-icon import cannot represent external runtime data."], dont: ["Do not pay the full-registry bundle cost for a name known in source."] },
});
