import { defineMeta } from "../metadata.ts";
import type { ButtonProps } from "./Button.tsx";

export default defineMeta<ButtonProps>({
  name: "Button", package: "@gemologic/sheen", category: "primitives", summary: "Triggers an action. Use a link for navigation.",
  props: {
    variant: { description: "Visual treatment; solid accent actions should be rare.", default: "ghost", control: { kind: "select", values: ["solid", "soft", "outline", "ghost", "link"] } },
    tone: { description: "Semantic color role, independent of visual treatment.", default: "neutral", control: { kind: "select", values: ["neutral", "accent", "danger", "success"] } },
    size: { description: "Density-aware control size.", default: "md", control: { kind: "select", values: ["xs", "sm", "md", "lg"] } },
    loading: { description: "Marks pending work and disables activation.", default: false, control: { kind: "boolean" } },
    shortcut: { description: "Typed shortcut registration whose action invokes this native button; omitted controls remain ordinary buttons." },
  },
  tokens: ["--sheen-button-radius", "--sheen-control-h-md", "--sheen-color-accent"],
  a11y: { role: "button", keyboard: ["Enter", "Space"] },
  examples: [{ title: "Quiet action", code: "<Button>Cancel</Button>" }, { title: "Primary action", code: '<Button variant="solid" tone="accent">Save changes</Button>' }, { title: "Shortcut action", code: '<Button shortcut={{ keys: "mod+s", scope: "global", label: "Save changes", group: "Editing" }}>Save changes</Button>' }],
  composer: { allowedParentRegions: ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"], acceptedChildRegions: [], editableSafeProps: ["children", "variant", "tone", "size", "loading", "disabled"], fixtureFactory: "action", codeGenerationAdapter: "text-child" },
  guidance: { do: ["Keep existing content visible while an action is pending."], dont: ["Do not use Button for URL navigation."] },
});
