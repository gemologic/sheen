import { defineMeta } from "../metadata.ts";
import type { AlertProps } from "./Notice.tsx";

export default defineMeta<AlertProps>({
  "name": "Alert",
  "package": "@gemologic/sheen",
  "category": "feedback",
  "summary": "An urgent, persistent message that does not move focus or dismiss itself.",
  "props": {
    "tone": {
      "description": "Semantic notice role, independent of the accent preset.",
      "default": "danger",
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
    "role": "alert",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Alert composition",
      "code": "<Alert heading=\"Save failed\">Your draft is retained. Try saving again.</Alert>"
    }
  ],
  "guidance": {
    "do": [
      "Use for dynamically appearing important information without stealing focus."
    ],
    "dont": [
      "Do not auto-dismiss an alert or focus it when it appears."
    ]
  }
});
