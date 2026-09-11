import { defineMeta } from "../metadata.ts";
import type { PaginationProps } from "./Pagination.tsx";

export default defineMeta<PaginationProps>({
  name: "Pagination", package: "@gemologic/sheen", category: "navigation", summary: "Requests pages while announcing only controlled, accepted results.",
  props: {
    pageIndex: { description: "Zero-based accepted page. Empty results require zero." },
    pageCount: { description: "Nonnegative safe integer count; zero represents empty results." },
    onPageChange: { description: "Requests a new zero-based page; the app updates pageIndex only after acceptance." },
    pending: { description: "Prevents further requests without removing keyboard focus or replacing accepted page text.", default: false },
    disabled: { description: "Prevents requests without exposing a busy state, for example while retained rows belong to a different failed query.", default: false },
    label: { description: "Navigation landmark name; defaults to the provider's pagination message." },
  },
  tokens: ["--sheen-space-inline-xs", "--sheen-color-bg-selected", "--sheen-color-fg-muted"],
  a11y: { role: "navigation, status", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Controlled pages", code: '<Pagination pageIndex={0} pageCount={10} onPageChange={index => console.log(index)} />' }],
  guidance: { do: ["Use within ThemeProvider for explicit locale and translated messages.", "Retain the accepted page during remote work and expose errors/retry in the owning region.", "Use Link for URL navigation; these controls request app-owned dataset changes."], dont: ["Do not announce requested pages before their results are accepted.", "Do not use pagination=false to mean infinite network fetching."] },
});
