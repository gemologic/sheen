import { defineMeta } from "../../ui/src/metadata.ts";
import type { PageHeaderProps } from "./PageHeader.tsx";
export default defineMeta<PageHeaderProps>({
  name: "PageHeader", package: "@gemologic/sheen-patterns", category: "application", summary: "A compact page heading with persistent breadcrumb, action, and tabs slots.",
  props: {
    title: { description: "Required nonempty visible heading and accessible group name." },
    headingLevel: { description: "Semantic heading level, independent of the compact visual size. Defaults to 1." },
    breadcrumb: { description: "Optional breadcrumb row above the title/action row." },
    actions: { description: "Persistent action controls beside the heading, wrapping when space is constrained." },
    tabs: { description: "Optional tabs row below the heading; tabs retain ownership of keyboard navigation." },
  },
  tokens: ["--sheen-space-inline-sm", "--sheen-space-block-xs", "--sheen-color-border"],
  a11y: { role: "group, heading", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Page actions", imports: 'import { Button } from "@gemologic/sheen";', code: '<PageHeader title="Orders" actions={<Button>Export orders</Button>} />' }],
  composer: { allowedParentRegions: ["page-header"], acceptedChildRegions: [], editableSafeProps: ["title", "headingLevel"], fixtureFactory: "application-heading", codeGenerationAdapter: "props" },
  guidance: { do: ["Choose the heading level to match the document outline.", "Supply Breadcrumb and Tabs components in their named slots."], dont: ["Do not use this component to set document.title.", "Do not replace the header subtree during background refresh."] },
});
