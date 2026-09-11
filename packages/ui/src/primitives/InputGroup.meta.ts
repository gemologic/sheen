import { defineMeta } from "../metadata.ts";
import type { InputGroupProps } from "./InputGroup.tsx";

export default defineMeta<InputGroupProps>({
  name: "InputGroup", package: "@gemologic/sheen", category: "forms",
  summary: "A labeled input with logical start/end content, keeping native control and action behavior.",
  props: {
    label: { description: "Required visible input label.", control: { kind: "text" } },
    description: { description: "Instructions associated with the input.", control: { kind: "text" } },
    error: { description: "App-owned validation message associated with the invalid input.", control: { kind: "text" } },
    startContent: { description: "Leading text or action. Supply accessible labels for actions and aria-hidden for purely decorative content." },
    endContent: { description: "Trailing text or action. Actions own their disabled state independently of the input." },
  },
  tokens: ["--sheen-color-bg-inset", "--sheen-color-fg-muted", "--sheen-color-border-control", "--sheen-space-inline-sm"],
  a11y: { role: "native input with separate native actions", keyboard: ["Tab follows start action, input, end action in DOM order", "Native text editing"] },
  examples: [{ title: "Amount with unit", code: '<InputGroup label="Amount (USD)" inputMode="decimal" endContent="USD" />' }],
  guidance: { do: ["Include meaningful units in the label or associated instructions; adjacent text is not automatically part of the accessible name.", "Use labeled Buttons for actions and own their disabled state."], dont: ["Do not hide interactive addons from assistive technology.", "Do not wrap InputGroup in another Field; its label and error are already included."] },
});
