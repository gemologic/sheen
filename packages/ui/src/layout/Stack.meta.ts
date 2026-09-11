import { defineMeta } from "../metadata.ts";
import type { StackProps } from "./Layout.tsx";

export default defineMeta<StackProps>({
  "name": "Stack",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "Vertical flow with density-aware block spacing.",
  "props": {
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
    },
    "justify": {
      "description": "Main-axis distribution without reversing content order.",
      "default": "start",
      "control": {
        "kind": "select",
        "values": [
          "start",
          "center",
          "end",
          "between"
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
      "title": "Stack composition",
      "code": "<Stack><Input label=\"Name\" /><Button>Save</Button></Stack>"
    }
  ],
  "composer": {
    "allowedParentRegions": ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"],
    "acceptedChildRegions": ["children"],
    "editableSafeProps": ["gap", "align", "justify"],
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
