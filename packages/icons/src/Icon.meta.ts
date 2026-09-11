export default Object.freeze({
  name: "Icon", package: "@gemologic/sheen-icons", category: "icons",
  summary: "A statically analyzable semantic icon marker replaced by the Sheen Vite integration.",
  props: {
    name: { description: "Literal semantic registry name; dynamic values belong on DynamicIcon." },
    size: { description: "Token-sized icon dimensions.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } },
    tone: { description: "Muted at rest or inherited from an interactive parent.", default: "muted", control: { kind: "select", values: ["muted", "inherit"] } },
    decorative: { description: "Decorative by default; set false together with a nonempty label for meaningful imagery.", default: true, control: { kind: "boolean" } },
    label: { description: "Required accessible name when decorative is false.", control: { kind: "text" } },
  },
  tokens: ["--sheen-icon-size-sm", "--sheen-icon-size-md", "--sheen-icon-size-lg", "--sheen-color-fg-muted"],
  a11y: { role: "img when meaningful; hidden when decorative", keyboard: [] },
  examples: [{ title: "Literal icon", code: '<Icon name="search" decorative={false} label="Search" />' }],
  guidance: { do: ["Configure sheenIcons with every icon set used by bundled themes."], dont: ["Do not pass computed names; use DynamicIcon when the name is genuinely runtime data."] },
});
