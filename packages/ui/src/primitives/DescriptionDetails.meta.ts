import { defineMeta } from "../metadata.ts";
import type { DescriptionDetailsProps } from "./DescriptionList.tsx";

export default defineMeta<DescriptionDetailsProps>({
  "name": "DescriptionDetails",
  "package": "@gemologic/sheen",
  "category": "data-display",
  "summary": "A semantic value in a description list, optionally using tabular figures.",
  "props": {
    "numeric": {
      "description": "Enable tabular figures for numeric values; formatting remains app-owned or uses the context locale formatter.",
      "default": false,
      "control": {
        "kind": "boolean"
      }
    }
  },
  "tokens": [
    "--sheen-color-fg",
    "--sheen-color-fg-muted",
    "--sheen-text-ui-size",
    "--sheen-space-block-md",
    "--sheen-space-inline-lg"
  ],
  "a11y": {
    "role": "native dd",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Order details",
      "code": "<DescriptionList layout=\"columns\"><DescriptionTerm>Symbol</DescriptionTerm><DescriptionDetails>BTC</DescriptionDetails><DescriptionTerm>Quantity</DescriptionTerm><DescriptionDetails numeric>1.25</DescriptionDetails></DescriptionList>"
    }
  ],
  "guidance": {
    "do": [
      "Compose terms and details inside DescriptionList. Use one term/details pair per row in columns layout.",
      "Use stacked layout for multiple terms or descriptions in a semantic group."
    ],
    "dont": [
      "Do not use description lists as an interactive table or arbitrary layout grid."
    ]
  }
});
