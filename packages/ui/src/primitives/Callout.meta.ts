import { defineMeta } from "../metadata.ts";
import type { CalloutProps } from "./Notice.tsx";

export default defineMeta<CalloutProps>({
  "name": "Callout",
  "package": "@gemologic/sheen",
  "category": "feedback",
  "summary": "Static contextual information, not an urgent live-region announcement.",
  "props": {
    "tone": {
      "description": "Semantic notice role, independent of the accent preset.",
      "default": "info",
      "control": {
        "kind": "select",
        "values": [
          "info",
          "success",
          "warning",
          "danger"
        ]
      }
    },
    "heading": {
      "description": "Optional visible summary; does not change the document heading outline.",
      "control": {
        "kind": "text"
      }
    }
  },
  "tokens": [
    "--sheen-color-info-subtle",
    "--sheen-color-info-fg",
    "--sheen-color-focus-ring-offset"
  ],
  "a11y": {
    "role": "note",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Callout composition",
      "code": "<Callout heading=\"Retention policy\">History is retained for 30 days.</Callout>"
    }
  ],
  "guidance": {
    "do": [
      "Use role tokens and preserve the surrounding keyboard order."
    ],
    "dont": [
      "Do not use urgent announcements for static explanatory content."
    ]
  }
});
