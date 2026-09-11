import { defineMeta } from "../metadata.ts";
import type { TextProps } from "./Typography.tsx";

export default defineMeta<TextProps>({
  "name": "Text",
  "package": "@gemologic/sheen",
  "category": "typography",
  "summary": "Inline text with semantic type roles, accessible muted color, and optional tabular figures.",
  "props": {
    "size": {
      "description": "Semantic type role, not an arbitrary font size.",
      "default": "ui",
      "control": {
        "kind": "select",
        "values": [
          "caption",
          "ui-sm",
          "ui",
          "body"
        ]
      }
    },
    "tone": {
      "description": "Primary or AA-gated muted foreground.",
      "default": "default",
      "control": {
        "kind": "select",
        "values": [
          "default",
          "muted"
        ]
      }
    },
    "numeric": {
      "description": "Enable tabular figures for aligned numeric content.",
      "default": false,
      "control": {
        "kind": "boolean"
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
    "role": "inline text",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Text example",
      "code": "<Text tone=\"muted\" size=\"caption\">Updated recently</Text>"
    }
  ],
  "composer": {
    "allowedParentRegions": ["page-header", "toolbar", "main-grid", "details-panel", "status-bar", "overlays"],
    "acceptedChildRegions": [],
    "editableSafeProps": ["size", "tone", "numeric", "children"],
    "fixtureFactory": "lorem-body",
    "codeGenerationAdapter": "text-child"
  },
  "guidance": {
    "do": [
      "Use visible text as well as color to communicate meaning."
    ],
    "dont": [
      "Do not use low-contrast subtle tokens for meaningful text."
    ]
  }
});
