import { defineMeta } from "../metadata.ts";
import type { BannerProps } from "./Notice.tsx";

export default defineMeta<BannerProps>({
  "name": "Banner",
  "package": "@gemologic/sheen",
  "category": "feedback",
  "summary": "A full-width announcement at the top of a page or app shell, such as maintenance, billing, or environment state. A named region; dismissal is owned by the app.",
  "props": {
    "tone": {
      "description": "Semantic notice role, independent of the accent preset.",
      "default": "info",
      "control": {
        "kind": "select",
        "values": [
          "info",
          "success",
          "warning",
          "danger"
        ]
      }
    },
    "heading": {
      "description": "Optional visible summary; does not change the document heading outline.",
      "control": {
        "kind": "text"
      }
    },
    "icon": {
      "description": "Leading icon; defaults to the tone's status glyph. Pass false to remove it."
    },
    "actions": {
      "description": "Follow-up Buttons or Links shown after the message."
    },
    "onDismiss": {
      "description": "Shows a dismiss button; the owner removes the notice in response."
    },
    "dismissLabel": {
      "description": "Accessible name for the dismiss button.",
      "default": "Dismiss",
      "control": {
        "kind": "text"
      }
    }
  },
  "tokens": [
    "--sheen-color-info-subtle",
    "--sheen-color-bg-raised",
    "--sheen-color-border",
    "--sheen-color-info-fg",
    "--sheen-color-focus-ring-offset"
  ],
  "a11y": {
    "role": "region named by its heading",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Alert composition",
      "imports": "import { createSignal } from \"solid-js\";",
      "setup": "const [visible, setVisible] = createSignal(true);",
      "code": "<>{visible() && <Banner tone=\"warning\" heading=\"Scheduled maintenance\" actions={<Link href=\"/status\">Status page</Link>} onDismiss={() => setVisible(false)}>Writes pause Saturday 02:00 to 02:30 UTC.</Banner>}</>"
    }
  ],
  "guidance": {
    "do": [
      "Place one banner above the app chrome or page header for state that affects the whole session."
    ],
    "dont": [
      "Do not stack banners or use them for field or action feedback; use Alert or Toast."
    ]
  }
});
