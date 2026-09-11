import { defineMeta } from "@gemologic/sheen/metadata";
import type { DataTablePageProps } from "./DataTablePage.tsx";

export default defineMeta<DataTablePageProps>({
  name: "DataTablePage", package: "@gemologic/sheen-patterns", category: "application", summary: "Composes page header, app actions, saved-view controls, table-owned query and selection chrome, and explicit regional states.",
  props: {
    title: { description: "Visible page title and accessible loading-region label." },
    headingLevel: { description: "Semantic heading level for the page title.", default: 1 },
    breadcrumb: { description: "Optional breadcrumb rendered above the title." },
    headerActions: { description: "Optional page-level actions beside the title." },
    tabs: { description: "Optional page tabs below the title row." },
    toolbarLabel: { description: "Required accessible name for the app-action toolbar." },
    toolbarGroups: { description: "Stable app action groups; whole trailing groups overflow together." },
    views: { description: "Controlled app-backed saved-view records, selection, draft name, pending/error state, and operation callbacks." },
    state: { description: "Ready content or an authorization-safe not-found, server-error, or permission-denied replacement.", default: "ready" },
    loadingPhase: { description: "Idle, delayed cold fallback, or retained-content refresh presentation.", default: "idle" },
    loadingFallback: { description: "Layout-matched cold-load placeholder reserved in server markup." },
    errorTitle: { description: "Optional localized title overriding the selected regional error default." },
    errorDescription: { description: "Optional localized regional error detail." },
    onRetry: { description: "Optional regional error retry action." },
    status: { description: "Optional page status/footer content." },
    children: { description: "The DataTable owner. Its actions prop owns row, context, and selection action behavior." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border", "--sheen-color-danger-fg", "--sheen-space-block-sm", "--sheen-space-inline-sm"],
  a11y: { role: "region, heading, toolbar, form, alert", keyboard: ["Tab", "Shift+Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Space", "Escape"] },
  examples: [{
    title: "Continuous client table page",
    code: '<DataTablePage title="Accounts" toolbarLabel="Account actions" loadingFallback={<div>Loading accounts</div>}><section aria-label="Accounts table">Accepted table region</section></DataTablePage>',
  }],
  guidance: { do: ["Keep saved-view persistence and state application in the app adapter.", "Let the child DataTable own search, filters, result counts, columns, and export controls.", "Define DataTable actions once so row context and selection controls cannot drift.", "Use refresh to retain accepted table DOM; use permission-denied to remove unauthorized content immediately."], dont: ["Do not mirror DataTable query or selection controls into the page toolbar.", "Do not show a cold fallback during background refresh.", "Do not use saved-view records from localStorage as an implicit per-user persistence layer."] },
});
