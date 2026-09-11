import { defineMeta } from "../metadata.ts";
import type { CardProps } from "./Surface.tsx";

export default defineMeta<CardProps>({
  "name": "Card",
  "package": "@gemologic/sheen",
  "category": "surfaces",
  "summary": "A bordered raised surface, without a shadow unless explicitly requested.",
  "props": {
    "variant": {
      "description": "Semantic surface fill; also establishes the focus-ring offset for descendants.",
      "default": "raised",
      "control": {
        "kind": "select",
        "values": [
          "base",
          "subtle",
          "raised",
          "inset"
        ]
      }
    },
    "padding": {
      "description": "Role-based padding; none leaves spacing to the composition.",
      "default": "lg",
      "control": {
        "kind": "select",
        "values": [
          "none",
          "xs",
          "sm",
          "md",
          "lg",
          "xl"
        ]
      }
    },
    "bordered": {
      "description": "Adds a structural border, not an interactive-control boundary.",
      "default": true,
      "control": {
        "kind": "boolean"
      }
    },
    "elevated": {
      "description": "Opt-in raised shadow. Keep elevation sparse.",
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
    "role": "generic surface",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Card composition",
      "code": "<Card><Heading level={2} size=\"h3\">Workspace</Heading><Text>Project details</Text></Card>"
    }
  ],
  "composer": {
    "allowedParentRegions": ["toolbar", "main-grid", "details-panel", "overlays"],
    "acceptedChildRegions": ["children"],
    "editableSafeProps": ["variant", "padding", "bordered", "elevated"],
    "fixtureFactory": "surface",
    "codeGenerationAdapter": "children"
  },
  "guidance": {
    "do": [
      "Use role tokens and preserve the surrounding keyboard order."
    ],
    "dont": [
      "Do not add structural borders or shadows merely as decoration."
    ]
  }
});
