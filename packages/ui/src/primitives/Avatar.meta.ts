import { defineMeta } from "../metadata.ts";
import type { AvatarProps } from "./Avatar.tsx";

export default defineMeta<AvatarProps>({
  name: "Avatar", package: "@gemologic/sheen", category: "data", summary: "Shows a labeled identity image with a deterministic text fallback.",
  props: { label: { description: "Required accessible identity label." }, src: { description: "Optional image URL; load failure reveals the fallback." }, fallback: { description: "Optional fallback text, otherwise initials are derived from label." }, size: { description: "Token-sized avatar.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } } },
  tokens: ["--sheen-icon-size-sm", "--sheen-icon-size-md", "--sheen-icon-size-lg", "--sheen-color-bg-inset", "--sheen-color-fg-muted"],
  a11y: { role: "img", keyboard: [] },
  examples: [{ title: "Identity fallback", code: '<Avatar label="Ada Lovelace" />' }],
  guidance: { do: ["Provide the person's or entity's useful accessible name."], dont: ["Do not repeat a visible adjacent name in the label if that duplication harms the reading flow."] },
});
