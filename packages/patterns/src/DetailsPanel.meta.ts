import { defineMeta } from "@gemologic/sheen/metadata";
import type { DetailsPanelProps } from "./DetailsPanel.tsx";

export default defineMeta<DetailsPanelProps>({
  name: "DetailsPanel", package: "@gemologic/sheen-patterns", category: "application", summary: "One retained detail-content owner with docked, accessible-resizable, and modal Sheet presentations.",
  props: {
    panelId: { description: "Stable app or URL-backed identity for the accepted detail record." },
    title: { description: "Visible panel heading and accessible name." },
    open: { description: "App-owned visibility. Closed content remains mounted and inert while the model exists." },
    presentation: { description: "Deterministic docked or Sheet behavior. AdminApp changes this without replacing content.", default: "docked", control: { kind: "select", values: ["docked", "sheet"] } },
    onOpenChange: { description: "Visibility proposal from close, backdrop, or Escape." },
    returnFocus: { description: "Optional surviving focus origin used when closing." },
    resizable: { description: "Expose a pointer and keyboard separator in docked presentation.", default: false },
    width: { description: "Controlled width in CSS pixels." },
    defaultWidth: { description: "Initial uncontrolled width in CSS pixels.", default: 360 },
    minWidth: { description: "Minimum accepted width in CSS pixels.", default: 280 },
    maxWidth: { description: "Maximum accepted width in CSS pixels.", default: 640 },
    onWidthChange: { description: "Accepted resize proposal for app persistence or controlled state." },
    closeLabel: { description: "Localized close-control and backdrop label.", default: "Close details" },
    children: { description: "The single accepted details content owner, never duplicated between presentations." },
  },
  tokens: ["--sheen-color-bg-raised", "--sheen-color-border-control", "--sheen-color-focus-ring"],
  a11y: { role: "complementary, dialog, separator", keyboard: ["Tab", "Shift+Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"] },
  examples: [{ title: "Docked inspector", imports: 'import { ThemeProvider } from "@gemologic/sheen";', code: '<ThemeProvider><DetailsPanel panelId="order-42" title="Order 42" open onOpenChange={() => {}} resizable><p>Accepted detail</p></DetailsPanel></ThemeProvider>' }],
  guidance: { do: ["Keep panelId URL-backed or controlled and pass server-resolved presentation inputs when rendering standalone."], dont: ["Do not render separate desktop and mobile copies of the content."] },
});
