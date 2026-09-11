import { defineMeta } from "../metadata.ts";
import type { CodeProps } from "./Typography.tsx";

export default defineMeta<CodeProps>({
  "name": "Code",
  "package": "@gemologic/sheen",
  "category": "typography",
  "summary": "Inline code, rendered as code with the mono type role. Syntax highlighting belongs to CodeBlock.",
  "props": {},
  "tokens": [
    "--sheen-font-sans",
    "--sheen-font-mono",
    "--sheen-color-fg",
    "--sheen-color-fg-muted"
  ],
  "a11y": {
    "role": "code",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Code example",
      "code": "<Code>workspace.id</Code>"
    }
  ],
  "guidance": {
    "do": [
      "Use visible text as well as color to communicate meaning."
    ],
    "dont": [
      "Do not use low-contrast subtle tokens for meaningful text."
    ]
  }
});
