import { defineMeta } from "../metadata.ts";
import type { FieldProps } from "./Field.tsx";

export default defineMeta<FieldProps>({
  name: "Field", package: "@gemologic/sheen", category: "forms",
  summary: "A visible label, description, and validation message associated with one native labelable control.",
  props: {
    label: { description: "Required visible label.", control: { kind: "text" } },
    controlId: { description: "Override the stable generated control ID; must be unique in the document.", control: { kind: "text" } },
    description: { description: "Supporting instructions referenced by aria-describedby.", control: { kind: "text" } },
    error: { description: "Validation message, also referenced by aria-describedby. A nonempty error sets aria-invalid.", control: { kind: "text" } },
    required: { description: "Set native required and display a decorative required marker.", default: false, control: { kind: "boolean" } },
    disabled: { description: "Forward native disabled to the control.", default: false, control: { kind: "boolean" } },
    children: { description: "Render one labelable control and spread the supplied reactive bindings on it. Do not destructure or snapshot them." },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-color-danger-fg", "--sheen-space-block-xs"],
  a11y: { role: "native label association; no additional landmark or live region", keyboard: ["Native control behavior", "Label activation focuses its control"] },
  examples: [{ title: "Custom native control", code: '<Field label="Notes" description="Visible to the team.">{control => <textarea {...control} />}</Field>' }],
  guidance: { do: ["Use within wrapper implementations or for a custom labelable control. Input already composes Field.", "Keep controls mounted when descriptions or errors change. Apps own validation and announcements."], dont: ["Do not wrap a labeled Input in another Field.", "Do not use a single Field label for a group of controls; use group semantics."] },
});
