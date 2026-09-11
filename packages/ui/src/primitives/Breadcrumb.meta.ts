import { defineMeta } from "../metadata.ts";
import type { BreadcrumbProps } from "./Breadcrumb.tsx";
export default defineMeta<BreadcrumbProps>({
  name: "Breadcrumb", package: "@gemologic/sheen", category: "navigation", summary: "A labeled hierarchy of native ancestor links ending in the current page.",
  props: {
    items: { description: "Nonempty ordered path with stable unique IDs and nonempty labels. Ancestors require href; the final item renders as current-page text." },
    label: { description: "Navigation landmark label, defaulting to the scoped breadcrumb message." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-fg-muted", "--sheen-space-inline-sm", "--sheen-color-focus-ring"],
  a11y: { role: "navigation", keyboard: ["Tab", "Shift+Tab", "Enter"] },
  examples: [{ title: "Workspace path", code: '<Breadcrumb items={[{ id: "workspace", label: "Workspace", href: "/" }, { id: "settings", label: "Settings" }]} />' }],
  guidance: { do: ["Use real URLs so links support normal browser navigation and opening in another tab.", "Keep IDs stable when labels refresh."], dont: ["Do not use breadcrumbs for action buttons or tab selection.", "Do not hide the current page or truncate away its accessible name."] },
});
