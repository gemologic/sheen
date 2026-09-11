import { defineMeta } from "../metadata.ts";
import type { RowProps } from "./Layout.tsx";

export default defineMeta<RowProps>({
  "name": "Cluster",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "Row alias for wrapping groups of related controls.",
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
      "default": "center",
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
    },
    "wrap": {
      "description": "Wrap onto additional lines when inline space is exhausted.",
      "default": true,
      "control": {
        "kind": "boolean"
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
      "title": "Cluster composition",
      "code": "<Cluster><Button>One</Button><Button>Two</Button></Cluster>"
    }
  ],
  "guidance": {
    "do": [
      "Preserve logical DOM order and use token spacing."
    ],
    "dont": [
      "Do not use layout wrappers to invent inaccessible keyboard order."
    ]
  }
});
