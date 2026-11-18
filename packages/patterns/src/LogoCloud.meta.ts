import { defineMeta } from "@gemologic/sheen/metadata";
import type { LogoCloudProps } from "./LogoCloud.tsx";

export default defineMeta<LogoCloudProps>({
  name: "LogoCloud", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A captioned row of customer or partner marks with text names for assistive technology.",
  props: {
    label: { description: "Required visible caption and accessible section name, such as \"Trusted by teams at\".", control: { kind: "text" } },
    items: { description: "Marks with unique stable `id` and nonempty `name`. Optional `logo` is decorative and the name stays available as text; optional `href` links the mark." },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-text-h3-size", "--sheen-control-h-md", "--sheen-space-section"],
  a11y: { role: "region, list", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Wordmarks",
    code: '<LogoCloud label="Trusted by teams at" items={[{ id: "acme", name: "Acme" }, { id: "globex", name: "Globex" }, { id: "initech", name: "Initech" }]} />',
  }],
  guidance: {
    do: ["Use single-color SVG logos that draw with currentColor so they follow the theme.", "Keep the set to one row on desktop."],
    dont: ["Do not rely on a logo image's alt text; LogoCloud names each mark itself.", "Do not autoplay or scroll the logos."],
  },
});
