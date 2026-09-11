import { defineMeta } from "../metadata.ts";
import type { AccordionItemProps } from "./Accordion.tsx";
export default defineMeta<AccordionItemProps>({
  name: "AccordionItem", package: "@gemologic/sheen", category: "navigation", summary: "A heading, disclosure trigger, and retained panel inside Accordion.",
  props: {
    value: { description: "Stable unique value identifying this section." }, label: { description: "Visible heading-button label." },
    disabled: { description: "Disable this trigger without changing its expanded state.", default: false },
    headingLevel: { description: "Native heading level, from two through six.", default: 3 },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-focus-ring", "--sheen-space-block-sm"],
  a11y: { role: "heading containing disclosure button", keyboard: ["Enter", "Space", "Tab", "ArrowDown", "ArrowUp", "Home", "End"] },
  examples: [{ title: "Details section", code: '<Accordion><AccordionItem value="details" label="Details">Section content</AccordionItem></Accordion>' }],
  guidance: { do: ["Place inside Accordion and retain child ownership while content refreshes."], dont: ["Do not assume closing disables form submission or application effects."] },
});
