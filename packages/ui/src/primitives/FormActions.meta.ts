import { defineMeta } from "../metadata.ts";
import type { FormActionsProps } from "./Form.tsx";

export default defineMeta<FormActionsProps>({
  name: "FormActions", package: "@gemologic/sheen", category: "forms",
  summary: "The submit and cancel row that ends a Form, optionally sticky at the bottom of the scrolling container.",
  props: {
    sticky: { description: "Keeps the row visible at the bottom of the scroll container.", control: { kind: "boolean" } },
    align: { description: "Horizontal alignment of the actions.", default: "end", control: { kind: "select", values: ["start", "end", "between"] } },
  },
  tokens: ["--sheen-space-inline-sm", "--sheen-color-bg", "--sheen-color-border", "--sheen-z-chrome"],
  a11y: { role: "none; contains native buttons", keyboard: ["Tab", "Enter"] },
  examples: [{ title: "Save row", code: '<FormActions sticky><Button type="reset">Discard</Button><Button type="submit" variant="solid" tone="accent">Save</Button></FormActions>' }],
  guidance: { do: ["Put the primary action last."], dont: ["Do not disable submit to signal invalid input."] },
});
