import { defineMeta } from "../metadata.ts";
import type { EmptyStateProps } from "./EmptyState.tsx";

export default defineMeta<EmptyStateProps>({
  name: "EmptyState", package: "@gemologic/sheen", category: "data-display",
  summary: "A named region distinguishing an empty dataset from a query with no matches.",
  props: {
    kind: { description: "Select the localized empty or no-results default heading.", default: "empty", control: { kind: "select", values: ["empty", "no-results"] } },
    heading: { description: "Override the localized visible heading without assuming a document heading level.", control: { kind: "text" } },
    description: { description: "Optional explanation or recovery instructions below the heading.", control: { kind: "text" } },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-text-h4-size", "--sheen-space-section"],
  a11y: { role: "region, named by the visible heading unless explicitly overridden", keyboard: ["Tab reaches app-supplied actions in DOM order"] },
  examples: [{ title: "No filter matches", code: '<EmptyState kind="no-results" description="Try a different symbol."><Button onClick={() => {}}>Clear filters</Button></EmptyState>' }],
  guidance: {
    do: ["Supply app-owned actions through children, such as clearing filters or creating the first item.", "Use no-results only after the query completes successfully with zero matches."],
    dont: ["Do not render an empty state for loading, refresh, permission denial, or transport errors.", "Do not steal focus or automatically announce the entire region. The app owns result-status announcements."],
  },
});
