import { defineMeta } from "../metadata.ts";
import type { ActivityTimelineProps } from "./ActivityTimeline.tsx";

export default defineMeta<ActivityTimelineProps>({
  name: "ActivityTimeline", package: "@gemologic/sheen", category: "data display", summary: "A stable chronological list with complete, current, upcoming, and error states encoded by text and shape.",
  props: {
    ref: { description: "Native ordered-list reference." }, label: { description: "Required accessible timeline name." }, items: { description: "Stable-ID chronological records with visible state, optional description/actor, and paired machine/display time." }, density: { description: "Default or compact vertical rhythm.", default: "default", control: { kind: "select", values: ["compact", "default"] } }, refreshing: { description: "Marks accepted items busy without replacing or dimming them.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent-subtle", "--sheen-color-success-subtle", "--sheen-color-danger-subtle"],
  a11y: { role: "ordered list of article entries", keyboard: [] },
  examples: [{ title: "Deployment activity", code: '<ActivityTimeline label="Deployment activity" items={[{ id: "approved", title: "Approved", state: "completed", timestamp: "2026-09-08T18:00:00Z", timeLabel: "2:00 PM" }, { id: "deploying", title: "Deploying", state: "current" }]} />' }],
  composer: { allowedParentRegions: ["main-grid", "details-panel"], acceptedChildRegions: [], editableSafeProps: ["label", "density", "refreshing"], fixtureFactory: "activity", codeGenerationAdapter: "activity-fixture" },
  guidance: { do: ["Keep item IDs stable across refresh and provide a display label with every machine timestamp."], dont: ["Do not rely on marker color alone; the visible state label is part of the contract."] },
});
