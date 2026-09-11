import { defineMeta } from "../metadata.ts";
import type { KbdProps } from "./Typography.tsx";

export default defineMeta<KbdProps>({
  "name": "Kbd",
  "package": "@gemologic/sheen",
  "category": "typography",
  "summary": "Semantic keyboard-input notation. Shortcut registration and platform formatting are separate concerns.",
  "props": {},
  "tokens": [
    "--sheen-font-sans",
    "--sheen-font-mono",
    "--sheen-color-fg",
    "--sheen-color-fg-muted"
  ],
  "a11y": {
    "role": "keyboard input",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Kbd example",
      "code": "<Kbd aria-label=\"Control K\">Ctrl K</Kbd>"
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
