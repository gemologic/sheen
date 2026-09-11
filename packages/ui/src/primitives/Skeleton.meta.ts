import { defineMeta } from "../metadata.ts";
import type { SkeletonProps } from "./Skeleton.tsx";

export default defineMeta<SkeletonProps>({
  name: "Skeleton",
  package: "@gemologic/sheen",
  category: "loading",
  summary: "A static decorative placeholder for a region's genuine first load.",
  props: {
    shape: { description: "Text line, rectangular region, or circular placeholder. Supply logical dimensions through style for the expected content geometry.", default: "text", control: { kind: "select", values: ["text", "rectangle", "circle"] } },
  },
  tokens: ["--sheen-color-bg-subtle", "--sheen-color-border", "--sheen-control-radius", "--sheen-surface-radius", "--sheen-text-ui-leading", "--sheen-control-h-lg"],
  a11y: { role: "decorative, hidden and inert", keyboard: [] },
  examples: [{ title: "Cold-load placeholder", code: '<Skeleton shape="rectangle" style={{ "block-size": "var(--sheen-control-h-lg)" }} />' }],
  guidance: {
    do: ["Reserve the geometry of the expected content. The app owns the 200ms cold-load delay and a localized loading status for the region."],
    dont: ["Do not replace loaded content during refresh or navigation with a skeleton.", "Do not put controls or meaningful content inside a skeleton. It is hidden from assistive technology and inert.", "Do not add shimmer, pulse, or mount animation."],
  },
});
