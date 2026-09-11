import { defineMeta } from "../metadata.ts";
import type { AvatarGroupProps } from "./Avatar.tsx";

export default defineMeta<AvatarGroupProps>({
  name: "AvatarGroup", package: "@gemologic/sheen", category: "data", summary: "Presents a labeled bounded set of identities and a localized overflow count.",
  props: { label: { description: "Accessible name for the identity group." }, avatars: { description: "Ordered identities with stable unique IDs." }, max: { description: "Maximum visible identities before the overflow count.", default: 5 }, size: { description: "Shared token size.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } } },
  tokens: ["--sheen-space-inline-xs", "--sheen-color-bg-inset", "--sheen-color-border-control"],
  a11y: { role: "group", keyboard: [] },
  examples: [{ title: "Reviewers", setup: 'const reviewers = [{ id: "ada", label: "Ada Lovelace" }, { id: "grace", label: "Grace Hopper" }];', code: '<AvatarGroup label="Reviewers" avatars={reviewers} />' }],
  guidance: { do: ["Keep input order meaningful and IDs stable."], dont: ["Do not use the overflow badge as an unlabeled action."] },
});
