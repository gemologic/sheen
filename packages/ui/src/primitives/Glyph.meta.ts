import { defineMeta } from "../metadata.ts";
import type { GlyphProps } from "./Glyph.tsx";

export default defineMeta<GlyphProps>({
  "name": "Glyph",
  "package": "@gemologic/sheen",
  "category": "typography",
  "summary": "Decorative component-chrome glyphs (chevrons, close, check, plus/minus, calendar, trends) shared by Sheen packages. Inherits text color and mirrors directional glyphs in RTL.",
  "props": {
    "name": {
      "description": "Glyph from the closed chrome set.",
      "control": { "kind": "select", "values": ["chevron-down", "chevron-up", "chevron-left", "chevron-right", "chevrons-left", "chevrons-right", "close", "check", "plus", "minus", "dot", "alert", "calendar", "search", "bell", "trend-up", "trend-down", "trend-flat", "more", "grip", "status-info", "status-success", "status-warning", "status-danger"] }
    }
  },
  "tokens": ["--sheen-icon-size-md"],
  "a11y": {
    "role": "presentation (aria-hidden)",
    "keyboard": []
  },
  "examples": [
    {
      "title": "Icon-only close button",
      "code": "<Button variant=\"ghost\" aria-label=\"Close\"><Glyph name=\"close\" /></Button>"
    }
  ],
  "guidance": {
    "do": [
      "Name the owning control with visible text or aria-label; the glyph itself is always hidden."
    ],
    "dont": [
      "Do not use Glyph for content imagery or app icons; use @gemologic/sheen-icons, which follows the theme's icon set."
    ]
  }
});
