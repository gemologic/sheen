import { defineMeta } from "../metadata.ts";
import type { IconButtonProps } from "./IconButton.tsx";
import tooltip from "./Tooltip.meta.ts";

const { composer: inheritedComposer, ...tooltipMetadata } = tooltip;
void inheritedComposer;
const inherited = Object.fromEntries(Object.entries(tooltip.props).filter(([name]) => name !== "content"));
export default defineMeta<IconButtonProps>({
  ...tooltipMetadata, name: "IconButton", category: "primitives",
  summary: "A square native icon action with a required accessible name and matching tooltip.",
  props: { ...inherited, label: { description: "Required nonempty action name, also shown in the tooltip.", control: { kind: "text" } }, children: { description: "Required noninteractive icon content, hidden from the accessible name." } },
  a11y: { role: "button", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape dismisses tooltip"] },
  tokens: [...tooltip.tokens, "--sheen-icon-size-md"],
  examples: [{ title: "More actions", code: '<IconButton label="More actions"><span>⋯</span></IconButton>' }],
  guidance: { do: ["Describe the action, not the icon's appearance.", "Supply noninteractive icon content; the label provides its accessible name."], dont: ["Do not nest interactive controls or use this for navigation.", "Do not duplicate a typed shortcut action with a separate useShortcut registration."] },
});
