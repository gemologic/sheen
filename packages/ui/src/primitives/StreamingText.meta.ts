import { defineMeta } from "../metadata.ts";
import type { StreamingTextProps } from "./StreamingText.tsx";

export default defineMeta<StreamingTextProps>({
  name: "StreamingText", package: "@gemologic/sheen", category: "ai", summary: "Plain text that grows token by token, retaining paragraph nodes and announcing completion once.",
  props: {
    ref: { description: "Native root reference." },
    text: { description: "The full accepted text so far. Blank lines separate paragraphs; other whitespace is preserved. Not parsed as markdown or HTML.", control: { kind: "text" } },
    streaming: { description: "Shows the caret and marks the text busy. Changing it from true to false announces completion politely.", default: false, control: { kind: "boolean" } },
    completeLabel: { description: "Completion announcement; defaults to the scoped responseComplete message." },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-duration-slow", "--sheen-space-block-md"],
  a11y: { role: "text with a polite status announcement", keyboard: [] },
  examples: [{ title: "Streaming reply", code: '<StreamingText text={"Checking the deploy log\\n\\nThe billing worker"} streaming />' }],
  guidance: { do: ["Publish the accumulated text, not individual tokens; appends rewrite only the final paragraph."], dont: ["Do not render model output as HTML.", "Do not toggle streaming per token; that would announce repeatedly."] },
});
