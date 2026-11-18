import { defineMeta } from "../metadata.ts";
import type { FormProps } from "./Form.tsx";

export default defineMeta<FormProps>({
  name: "Form", package: "@gemologic/sheen", category: "forms",
  summary: "A native form with token rhythm and pending state, composed with FormSection (titled field groups that sit beside their fields on wide containers) and FormActions (the submit row, optionally sticky).",
  props: {
    onSubmit: { description: "Receives native FormData after constraint validation; the default navigation is prevented. Return a promise to mark the form busy until it settles." },
  },
  tokens: ["--sheen-space-section", "--sheen-space-gutter", "--sheen-color-border", "--sheen-text-h4-size", "--sheen-color-fg-muted"],
  a11y: { role: "form; sections are headed regions and actions are native buttons", keyboard: ["Tab", "Shift+Tab", "Enter"] },
  examples: [{ title: "Settings form", code: '<Form onSubmit={data => console.info(Object.fromEntries(data))}>\n  <FormSection title="Profile" description="Shown to your teammates.">\n    <Input label="Display name" name="name" required />\n  </FormSection>\n  <FormActions sticky><Button type="reset">Discard</Button><Button type="submit" variant="solid" tone="accent">Save</Button></FormActions>\n</Form>' }],
  guidance: {
    do: ["Use native required, pattern, and type constraints, then show server errors on the matching Field.", "Put the primary action last in FormActions."],
    dont: ["Do not disable the submit button to signal invalid input; let validation explain what to fix."],
  },
});
