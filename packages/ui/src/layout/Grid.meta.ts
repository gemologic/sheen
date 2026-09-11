import { defineMeta } from "../metadata.ts";
import type { GridProps } from "./Layout.tsx";

export default defineMeta<GridProps>({
  "name": "Grid",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "One to twelve equal-width columns with role-based row and column gaps.",
  "props": {
    "columns": {
      "description": "Equal-width tracks with shrinkable minmax sizing.",
      "default": 1,
      "control": {
        "kind": "select",
        "values": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12
        ]
      }
    },
    "gap": {
      "description": "Role-based spacing that follows the active density.",
      "default": "md",
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
    "align": {
      "description": "Cross-axis alignment without changing DOM or keyboard order.",
      "default": "stretch",
      "control": {
        "kind": "select",
        "values": [
          "start",
          "center",
          "end",
          "stretch"
        ]
      }
    }
  },
  "tokens": [
    "--sheen-space-block-md",
    "--sheen-space-inline-md"
  ],
  "a11y": {
    "role": "presentation layout",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Grid composition",
      "code": "<Grid columns={2}><Input label=\"First name\" /><Input label=\"Last name\" /></Grid>"
    }
  ],
  "composer": {
    "allowedParentRegions": ["toolbar", "main-grid", "details-panel", "overlays"],
    "acceptedChildRegions": ["children"],
    "editableSafeProps": ["columns", "gap", "align"],
    "fixtureFactory": "layout",
    "codeGenerationAdapter": "children"
  },
  "guidance": {
    "do": [
      "Preserve logical DOM order and use token spacing."
    ],
    "dont": [
      "Do not use layout wrappers to invent inaccessible keyboard order."
    ]
  }
});
