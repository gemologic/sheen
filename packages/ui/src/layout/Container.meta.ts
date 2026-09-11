import { defineMeta } from "../metadata.ts";
import type { ContainerProps } from "./Layout.tsx";

export default defineMeta<ContainerProps>({
  "name": "Container",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "Full-width content boundary with token padding, without centering or imposing a document width.",
  "props": {
    "padding": {
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
      "title": "Container composition",
      "code": "<Container><Stack><Input label=\"Name\" /><Button>Save</Button></Stack></Container>"
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
