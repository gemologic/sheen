import { defineMeta } from "../metadata.ts";
import type { SurfaceProps } from "./Surface.tsx";

export default defineMeta<SurfaceProps>({
  "name": "Surface",
  "package": "@gemologic/sheen",
  "category": "surfaces",
  "summary": "Semantic surface with role padding and an inherited focus-ring offset.",
  "props": {
    "variant": {
      "description": "Semantic surface fill; also establishes the focus-ring offset for descendants.",
      "default": "base",
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
      "default": "none",
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
      "default": false,
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
      "title": "Surface composition",
      "code": "<Surface variant=\"raised\" padding=\"md\"><Input label=\"Name\" /></Surface>"
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
