import { defineMeta } from "../metadata.ts";
import type { SpacerProps } from "./Layout.tsx";

export default defineMeta<SpacerProps>({
  "name": "Spacer",
  "package": "@gemologic/sheen",
  "category": "layout",
  "summary": "Decorative flexible space in a Row or Stack; use gap for fixed spacing.",
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
      "title": "Spacer composition",
      "code": "<Row><Button>Back</Button><Spacer /><Button>Next</Button></Row>"
    }
  ],
  "guidance": {
    "do": [
      "Preserve logical DOM order and use token spacing."
    ],
    "dont": [
      "Do not put content or interactive children inside Spacer."
    ]
  }
});
