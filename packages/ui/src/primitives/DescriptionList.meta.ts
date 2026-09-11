import { defineMeta } from "../metadata.ts";
import type { DescriptionListProps } from "./DescriptionList.tsx";

export default defineMeta<DescriptionListProps>({
  "name": "DescriptionList",
  "package": "@gemologic/sheen",
  "category": "data-display",
  "summary": "A native description list for related names and values.",
  "props": {
    "layout": {
      "description": "Stacked labels and values, or columns using one term followed by one details element per pair.",
      "default": "stacked",
      "control": {
        "kind": "select",
        "values": [
          "stacked",
          "columns"
        ]
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
    "role": "native dl",
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
