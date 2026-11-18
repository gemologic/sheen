import { defineMeta } from "../metadata.ts";
import type { FormSectionProps } from "./Form.tsx";

export default defineMeta<FormSectionProps>({
  name: "FormSection", package: "@gemologic/sheen", category: "forms",
  summary: "A titled group of related fields inside a Form. Containers at least 40rem wide place the title and description beside the fields.",
  props: {
    title: { description: "Section heading, rendered as an h2.", control: { kind: "text" } },
    description: { description: "Short explanation of what the fields control." },
  },
  tokens: ["--sheen-space-section", "--sheen-space-gutter", "--sheen-text-h4-size", "--sheen-color-fg-muted", "--sheen-color-border"],
  a11y: { role: "section with a heading", keyboard: [] },
  examples: [{ title: "Profile section", code: '<FormSection title="Profile" description="Shown to teammates."><Input label="Display name" name="name" /></FormSection>' }],
  guidance: { do: ["Group fields by what the user is deciding, not by data type."], dont: ["Do not nest FormSections."] },
});
