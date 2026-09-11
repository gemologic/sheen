import { defineMeta } from "../metadata.ts";
import type { CenterProps } from "./Layout.tsx";

export default defineMeta<CenterProps>({
  "name": "Center",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "Centers content within the space allocated by its parent.",
  "props": {},
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
      "title": "Center composition",
      "code": "<Center><Button>Continue</Button></Center>"
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
