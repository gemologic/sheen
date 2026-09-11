import { defineMeta } from "../metadata.ts";
import type { HeadingProps } from "./Typography.tsx";

export default defineMeta<HeadingProps>({
  "name": "Heading",
  "package": "@gemologic/sheen",
  "category": "typography",
  "summary": "A real h1 through h6 with independently selectable heading typography.",
  "props": {
    "level": {
      "description": "Document outline level; choose semantically rather than for visual size.",
      "control": {
        "kind": "select",
        "values": [
          1,
          2,
          3,
          4,
          5,
          6
        ]
      }
    },
    "size": {
      "description": "Optional visual type role, independent of the document outline level.",
      "control": {
        "kind": "select",
        "values": [
          "h1",
          "h2",
          "h3",
          "h4"
        ]
      }
    }
  },
  "tokens": [
    "--sheen-font-sans",
    "--sheen-font-mono",
    "--sheen-color-fg",
    "--sheen-color-fg-muted"
  ],
  "a11y": {
    "role": "heading",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Heading example",
      "code": "<Heading level={2} size=\"h3\">Workspace settings</Heading>"
    }
  ],
  "composer": {
    "allowedParentRegions": ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"],
    "acceptedChildRegions": [],
    "editableSafeProps": ["level", "size", "children"],
    "fixtureFactory": "lorem-title",
    "codeGenerationAdapter": "text-child"
  },
  "guidance": {
    "do": [
      "Keep the document heading outline meaningful."
    ],
    "dont": [
      "Do not use low-contrast subtle tokens for meaningful text."
    ]
  }
});
