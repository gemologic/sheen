import { defineMeta } from "../metadata.ts";
import type { ButtonGroupProps } from "./ButtonGroup.tsx";

export default defineMeta<ButtonGroupProps>({
  name: "ButtonGroup", package: "@gemologic/sheen", category: "primitives",
  summary: "A labeled group of related native actions with horizontal or vertical layout.",
  props: {
    label: { description: "Required nonempty accessible group name.", control: { kind: "text" } },
    orientation: { description: "Layout direction, horizontal by default; does not change keyboard behavior.", control: { kind: "select", values: ["horizontal", "vertical"] } },
  },
  tokens: ["--sheen-space-inline-xs"],
  a11y: { role: "group", keyboard: ["Tab visits enabled actions in DOM order", "Enter and Space activate native buttons"] },
  examples: [{ title: "Document actions", code: '<ButtonGroup label="Document actions"><Button>Save</Button><Button>Discard</Button></ButtonGroup>' }],
  guidance: { do: ["Give each button its own accessible name, disabled state, and action."], dont: ["Do not use this as a single-selection control.", "Use Toolbar for a toolbar's roving keyboard model."] },
});
