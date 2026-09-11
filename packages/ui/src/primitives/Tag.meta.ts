import { defineMeta } from "../metadata.ts";
import type { TagProps } from "./Status.tsx";

export default defineMeta<TagProps>({
  "name": "Tag",
  "package": "@gemologic/sheen",
  "category": "data display",
  "summary": "A labeled chip with optional native-button removal; collection state remains app-owned.",
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
    },
    "label": {
      "description": "Plain-text tag identity, also used by the default accessible remove label.",
      "control": {
        "kind": "text"
      }
    },
    "onRemove": {
      "description": "App-owned removal callback. The app updates the collection and restores focus if the tag disappears."
    },
    "removeLabel": {
      "description": "Override the accessible remove-button name; defaults to the localized remove message plus label.",
      "control": {
        "kind": "text"
      }
    },
    "disabled": {
      "description": "Disables removal without hiding the tag.",
      "default": false,
      "control": {
        "kind": "boolean"
      }
    }
  },
  "tokens": [
    "--sheen-text-caption-size",
    "--sheen-color-success-fg",
    "--sheen-color-success-subtle"
  ],
  "a11y": {
    "role": "label with optional removal button",
    "keyboard": [
      "Tab",
      "Enter",
      "Space"
    ]
  },
  "examples": [
    {
      "title": "Tag example",
      "code": "<Tag label=\"In review\" tone=\"info\" />"
    }
  ],
  "guidance": {
    "do": [
      "Use visible text as well as color to communicate meaning."
    ],
    "dont": [
      "Do not remove a focused tag without moving focus to a surviving control."
    ]
  }
});
