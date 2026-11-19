export default Object.freeze({
  name: "LazyIcon", package: "@gemologic/sheen-icons", category: "icons",
  summary: "Resolves one semantic icon by runtime name through a per-icon dynamic import, without retaining the complete registry.",
  props: {
    name: { description: "Runtime semantic name. Unknown names render a visible dashed marker instead of throwing; map lucide names first with resolveLucideIconName.", control: { kind: "text" } },
    size: { description: "Token-sized icon dimensions, also reserved by the loading placeholder.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } },
    tone: { description: "Muted at rest or inherited from an interactive parent.", default: "muted", control: { kind: "select", values: ["muted", "inherit"] } },
    decorative: { description: "Decorative by default; set false together with a nonempty label for meaningful imagery. The label is present while loading and for unknown names.", default: true, control: { kind: "boolean" } },
    label: { description: "Required accessible name when decorative is false.", control: { kind: "text" } },
  },
  tokens: ["--sheen-icon-size-sm", "--sheen-icon-size-md", "--sheen-icon-size-lg", "--sheen-color-fg-muted", "--sheen-color-border-control", "--sheen-control-radius"],
  a11y: { role: "img when meaningful; hidden when decorative", keyboard: [] },
  examples: [
    { title: "Server-supplied name", code: '<LazyIcon name="gitBranch" decorative={false} label="Branch" />' },
    { title: "Lucide migration", setup: 'const stored = "trash-2";', code: "<LazyIcon name={resolveLucideIconName(stored) ?? stored} />" },
  ],
  guidance: {
    do: ["Use for names that arrive from a server or schema at runtime.", "Await preloadIcons with the same names on the server and before client hydration when the first paint must show the glyph."],
    dont: ["Do not use for names known in source; the literal Icon transform or a per-icon import has no loading state.", "Do not treat an unknown-name marker as an error the user can fix."],
  },
});
