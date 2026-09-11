import { defineMeta } from "../metadata.ts";
import type { DescriptionTermProps } from "./DescriptionList.tsx";

export default defineMeta<DescriptionTermProps>({
  "name": "DescriptionTerm",
  "package": "@gemologic/sheen",
  "category": "data-display",
  "summary": "A semantic name in a description list.",
  "props": {},
  "tokens": [
    "--sheen-color-fg",
    "--sheen-color-fg-muted",
    "--sheen-text-ui-size",
    "--sheen-space-block-md",
    "--sheen-space-inline-lg"
  ],
  "a11y": {
    "role": "native dt",
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
