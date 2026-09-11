import { defineMeta } from "../metadata.ts";
import type { AccordionProps } from "./Accordion.tsx";
export default defineMeta<AccordionProps>({
  name: "Accordion", package: "@gemologic/sheen", category: "navigation", summary: "Coordinates expansion and keyboard navigation for related disclosure sections.",
  props: {
    value: { description: "Controlled expanded item values." }, defaultValue: { description: "Initially expanded uncontrolled item values." },
    onValueChange: { description: "Requested expanded values; controlled owners may reject changes." },
    multiple: { description: "Allow multiple sections to remain expanded.", default: false },
    collapsible: { description: "Allow the selected single-mode section to close.", default: true },
  },
  tokens: ["--sheen-duration-normal", "--sheen-space-block-sm"],
  a11y: { role: "group of disclosure headings", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "ArrowDown", "ArrowUp", "Home", "End"] },
  examples: [{ title: "Settings sections", code: '<Accordion><AccordionItem value="general" label="General"><Input label="Name" /></AccordionItem></Accordion>' }],
  guidance: { do: ["Use stable, unique item values.", "Use a heading level appropriate to the surrounding document."], dont: ["Do not use an accordion as a tab interface or route navigation."] },
});
