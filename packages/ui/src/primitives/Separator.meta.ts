import { defineMeta } from "../metadata.ts";
import type { SeparatorProps } from "./Separator.tsx";

export default defineMeta<SeparatorProps>({
  "name": "Separator",
  "package": "@gemologic/sheen",
  "category": "surfaces",
  "summary": "A structural divider with native separator semantics and an explicit decorative mode.",
  "props": {
    "orientation": {
      "description": "Horizontal or vertical separation. Vertical separators stretch within a constrained flex or grid row.",
      "default": "horizontal",
      "control": {
        "kind": "select",
        "values": [
          "horizontal",
          "vertical"
        ]
      }
    },
    "decorative": {
      "description": "Hide a purely visual divider from assistive technology.",
      "default": false,
      "control": {
        "kind": "boolean"
      }
    }
  },
  "tokens": [
    "--sheen-color-bg-raised",
    "--sheen-color-border",
    "--sheen-color-focus-ring-offset"
  ],
  "a11y": {
    "role": "separator unless decorative",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Separator composition",
      "code": "<Stack><Text>First section</Text><Separator /><Text>Second section</Text></Stack>"
    }
  ],
  "guidance": {
    "do": [
      "Use role tokens and preserve the surrounding keyboard order."
    ],
    "dont": [
      "Do not add structural borders or shadows merely as decoration."
    ]
  }
});
