import { defineMeta } from "../metadata.ts";
import type { BadgeProps } from "./Status.tsx";

export default defineMeta<BadgeProps>({
  "name": "Badge",
  "package": "@gemologic/sheen",
  "category": "data display",
  "summary": "A non-interactive status label with independently themed status and market roles.",
  "props": {
    "tone": {
      "description": "Semantic status or market role, independent of the selected accent.",
      "default": "neutral",
      "control": {
        "kind": "select",
        "values": [
          "neutral",
          "accent",
          "info",
          "success",
          "warning",
          "danger",
          "market-up",
          "market-down",
          "market-flat"
        ]
      }
    },
    "variant": {
      "description": "Soft fill, solid fill, or outline treatment.",
      "default": "soft",
      "control": {
        "kind": "select",
        "values": [
          "soft",
          "solid",
          "outline"
        ]
      }
    },
    "size": {
      "description": "Density-aware label size.",
      "default": "sm",
      "control": {
        "kind": "select",
        "values": [
          "sm",
          "md"
        ]
      }
    }
  },
  "tokens": [
    "--sheen-text-caption-size",
    "--sheen-color-success-fg",
    "--sheen-color-success-subtle"
  ],
  "a11y": {
    "role": "status label, not an automatic live region",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Badge example",
      "code": "<Badge tone=\"success\">Healthy</Badge>"
    }
  ],
  "guidance": {
    "do": [
      "Use visible text as well as color to communicate meaning."
    ],
    "dont": [
      "Do not use Badge as a button or make every badge a live region."
    ]
  }
});
