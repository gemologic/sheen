import { defineMeta } from "../metadata.ts";
import type { ScrollAreaProps } from "./ScrollArea.tsx";
export default defineMeta<ScrollAreaProps>({
  name: "ScrollArea", package: "@gemologic/sheen", category: "layout", summary: "A named, keyboard-accessible native scrolling viewport that retains content and scroll ownership.",
  props: {
    label: { description: "Required accessible name distinguishing this scrolling region." },
    orientation: { description: "Scrollable axes. The parent must constrain their dimensions.", default: "vertical" },
  },
  tokens: ["--sheen-color-fg-subtle", "--sheen-color-focus-ring"],
  a11y: { role: "region", keyboard: ["Tab", "Shift+Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"] },
  examples: [{ title: "Constrained activity pane", code: '<ScrollArea label="Activity" style={{ height: "12rem" }}><p>Activity content</p></ScrollArea>' }],
  guidance: { do: ["Constrain the viewport through its grid/flex parent or explicit size.", "Use its native ref for app-owned per-pane restoration."], dont: ["Do not remount the viewport to refresh its content.", "Do not treat this as virtualization or automatic data loading."] },
});
