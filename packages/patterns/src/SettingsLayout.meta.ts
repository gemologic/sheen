import { defineMeta } from "@gemologic/sheen/metadata";
import type { SettingsLayoutProps } from "./SettingsLayout.tsx";

export default defineMeta<SettingsLayoutProps>({
  name: "SettingsLayout", package: "@gemologic/sheen-patterns", category: "application", summary: "A sectioned settings workspace with stable in-page navigation, app-owned dirty data, and one persistent asynchronous save bar.",
  props: {
    label: { description: "Accessible name for the settings workspace." },
    sections: { description: "Stable-ID section labels, optional descriptions, and app-owned setting content." },
    activeSection: { description: "Optional controlled section highlighted in the navigation rail." },
    onSectionChange: { description: "Receives navigation intent after a section button is activated." },
    sectionHeadingLevel: { description: "Semantic heading level shared by section titles.", default: 2 },
    dirty: { description: "App-owned dirty state registered with the surrounding AppShell navigation guard." },
    onSave: { description: "App save operation. Rejections retain content and expose a localized failure state." },
    onDiscard: { description: "Optional app-owned restoration of the last accepted settings values." },
    saveError: { description: "Optional app-localized save error retained beside the save controls." },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-fg-muted", "--sheen-space-section"],
  a11y: { role: "group, navigation, section, heading, status", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{
    title: "Dirty settings",
    imports: 'import { Input } from "@gemologic/sheen";',
    setup: 'const sections = [{ id: "profile", label: "Profile", content: <Input label="Display name" /> }];',
    code: '<AppShell label="Settings"><SettingsLayout label="Workspace settings" sections={sections} dirty={false} onSave={() => {}} /></AppShell>',
  }],
  guidance: { do: ["Keep draft and accepted values in the app and return the real save promise.", "Keep the layout mounted while saving and while section data refreshes.", "Pass activeSection when a router or observer owns section selection."], dont: ["Do not remount section inputs on save or refresh.", "Do not infer dirty state from the DOM.", "Do not hide the save bar when settings become clean and strand keyboard focus."] },
});
