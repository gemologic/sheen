import { defineMeta } from "../metadata.ts";
import type { TabsProps } from "./Tabs.tsx";
export default defineMeta<TabsProps>({
  name: "Tabs", package: "@gemologic/sheen", category: "navigation", summary: "Named tab panels with stable identities, retained drafts, and scoped keyboard navigation.",
  props: {
    label: { description: "Required accessible name for the tab list." },
    items: { description: "Ordered tabs with stable unique values, labels, and optional disabled state." },
    value: { description: "Controlled selected value." },
    defaultValue: { description: "Initial uncontrolled value; defaults to the first enabled tab." },
    onValueChange: { description: "Requests selection; controlled owners may reject it." },
    orientation: { description: "Tab list layout and arrow-key axis.", default: "horizontal" },
    activationMode: { description: "Automatic selects on arrow navigation; manual requires Enter or Space.", default: "automatic" },
    children: { description: "Panel renderer, mounted once per stable item value and retained while inactive." },
  },
  tokens: ["--sheen-color-fg", "--sheen-color-border", "--sheen-color-focus-ring"],
  a11y: { role: "tablist, tab, tabpanel", keyboard: ["Tab", "Shift+Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Enter", "Space"] },
  examples: [{ title: "Settings panels", code: '<Tabs label="Settings" items={[{ value: "general", label: "General" }, { value: "advanced", label: "Advanced" }]}>{value => <Input label={`${value} name`} />}</Tabs>' }],
  guidance: { do: ["Keep values stable during refresh.", "Use manual activation when selection starts expensive work."], dont: ["Do not use tabs as a substitute for URL navigation.", "Do not assume inactive panels stop effects or native form submission."] },
});
