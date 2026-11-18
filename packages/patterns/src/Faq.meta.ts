import { defineMeta } from "@gemologic/sheen/metadata";
import type { FaqProps } from "./Faq.tsx";

export default defineMeta<FaqProps>({
  name: "Faq", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A titled question list whose answers expand in place through Sheen's Accordion.",
  props: {
    title: { description: "Required nonempty section heading and accessible section name.", control: { kind: "text" } },
    eyebrow: { description: "Optional short kicker above the heading.", control: { kind: "text" } },
    description: { description: "Optional supporting copy, such as a contact link for unanswered questions." },
    items: { description: "Questions with unique stable `id`, nonempty `question`, and `answer` content. Answers render on the server while collapsed." },
    value: { description: "Controlled expanded item IDs. Omit for uncontrolled state." },
    defaultValue: { description: "Initially expanded item IDs for uncontrolled state." },
    onValueChange: { description: "Receives the next expanded item IDs." },
    multiple: { description: "Allows several answers open at once.", default: true, control: { kind: "boolean" } },
    headingLevel: { description: "Semantic level of the section heading; questions use the next level.", default: 2, control: { kind: "select", values: [2, 3, 4, 5] } },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-space-section", "--sheen-text-body-size"],
  a11y: { role: "region, heading, button (aria-expanded)", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "ArrowDown", "ArrowUp", "Home", "End"] },
  examples: [{
    title: "Common questions",
    code: '<Faq title="Questions" items={[{ id: "license", question: "What license is Sheen under?", answer: <p>MIT.</p> }, { id: "ssr", question: "Does it render on the server?", answer: <p>Yes, every component renders complete server markup.</p> }]} />',
  }],
  guidance: {
    do: ["Phrase each question as a reader would ask it.", "Keep answers short and link to full documentation."],
    dont: ["Do not hide essential pricing or legal terms only inside a collapsed answer.", "Do not nest another Accordion inside an answer."],
  },
});
