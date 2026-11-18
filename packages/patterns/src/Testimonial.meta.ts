import { defineMeta } from "@gemologic/sheen/metadata";
import type { TestimonialProps } from "./Testimonial.tsx";

export default defineMeta<TestimonialProps>({
  name: "Testimonial", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A quotation figure with attributed author, role, and optional avatar.",
  props: {
    quote: { description: "Required quotation content, usually one paragraph." },
    author: { description: "Required nonempty name of the person quoted.", control: { kind: "text" } },
    authorRole: { description: "Optional job title and organization of the author.", control: { kind: "text" } },
    avatar: { description: "Optional Avatar or image; give it an accessible label or mark it decorative." },
    cite: { description: "Optional source URL for the quotation, exposed as the blockquote cite attribute.", control: { kind: "text" } },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-fg-muted", "--sheen-elevation-raised", "--sheen-space-section"],
  a11y: { role: "figure, blockquote", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{
    title: "Customer quote",
    code: '<Testimonial quote={<p>We replaced three internal component kits in a week.</p>} author="Ada Lovelace" authorRole="Head of Platform, Analytical Engines" />',
  }],
  guidance: {
    do: ["Use real, attributable quotes.", "Lay several testimonials out in a grid owned by the page."],
    dont: ["Do not rotate testimonials automatically.", "Do not put interactive controls inside the quote."],
  },
});
