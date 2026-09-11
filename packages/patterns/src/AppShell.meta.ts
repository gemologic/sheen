import { defineMeta } from "@gemologic/sheen/metadata";
import type { AppShellProps } from "./AppShell.tsx";
export default defineMeta<AppShellProps>({
  name: "AppShell", package: "@gemologic/sheen-patterns", category: "application", summary: "A viewport-constrained application grid with persistent chrome and a native content pane.",
  props: {
    label: { description: "Required accessible name for the primary content scrolling region." },
    documentTitle: { description: "Optional accepted-route document title. Requires an app-owned MetaProvider and never derives copy from a URL." },
    header: { description: "Fixed top chrome, rendered once in a native header." },
    sidebar: { description: "Retained sidebar content, projected into desktop aside or phone modal without recreating its owner. Requires ThemeProvider; supply named navigation and constrain internal scrolling." },
    sidebarOpen: { description: "Controlled desktop sidebar visibility. Rejected proposals leave accepted state unchanged; hiding retains the sidebar DOM and removes it from interaction. Phone state is separate." },
    defaultSidebarOpen: { description: "Initial uncontrolled desktop visibility, true by default. Uncontrolled phone drawers independently start closed and reset when returning to desktop." },
    onSidebarOpenChange: { description: "Proposed sidebar visibility from the shell control or mod+/ binding. Supply sidebarOpen to own acceptance and persistence." },
    sidebarBehavior: { description: "Desktop toggle behavior. hide removes the sidebar from layout; collapse retains an interactive icon rail. Phone always uses the independent drawer.", default: "hide" },
    mobileSidebarOpen: { description: "Controlled phone drawer state, independent of desktop sidebarOpen. Uncontrolled phone drawers start closed. Sidebar content requires ThemeProvider." },
    onMobileSidebarOpenChange: { description: "Phone drawer visibility proposals from the toggle, shortcut, Escape, or outside press. Apps own controlled acceptance and persistence." },
    statusBar: { description: "Fixed bottom chrome, rendered once in a native footer." },
    router: { description: "Optional app-injected router adapter for dirty navigation blocking. Retry must bypass only this registration once. Requires the shell to be inside ThemeProvider." },
    contentReady: { description: "Defaults to true. Set false while main-pane route content is incomplete so saved scroll restoration can wait for growth; true settles at the current clamped boundary." },
    shortcutHelp: { description: "Enable localized help, pending indicator, global question-mark binding, and development-only mod+shift+d theme cycling. Requires app-owned ThemeProvider and ShortcutProvider ancestors; defaults to false. Apps should enable this even when character shortcuts are disabled. Development policy comes from ShortcutProvider." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border"],
  a11y: { role: "main, complementary, banner, contentinfo", keyboard: ["Tab", "Shift+Tab", "PageUp", "PageDown"] },
  examples: [
    { title: "Application frame", imports: 'import { MetaProvider } from "@solidjs/meta";', code: '<MetaProvider><AppShell label="Workspace" documentTitle="Workspace · Sheen" header={<h1>Workspace</h1>} statusBar={<span>Ready</span>}><p>Application content</p></AppShell></MetaProvider>' },
    { title: "Shared shortcut help", imports: 'import { ThemeProvider, ShortcutProvider } from "@gemologic/sheen";', code: '<ThemeProvider><ShortcutProvider development={true}><AppShell label="Workspace" shortcutHelp><p>Application content</p></AppShell></ShortcutProvider></ThemeProvider>' },
  ],
  guidance: { do: ["Load the patterns stylesheet alongside sheen styles.", "Use one shell per document; compare complete shells in separate iframes."], dont: ["Do not remount the shell during background refresh.", "Do not treat the initial layout as completed router or mobile-drawer integration."] },
});
