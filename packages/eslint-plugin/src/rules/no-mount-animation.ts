import { literalRule } from "../literal-rule.js";

function transientLayerFile(filename: string): boolean {
  const normalized = filename.replaceAll("\\", "/");
  return /\/(?:AlertDialog|ContextMenu|Dialog|Drawer|Menu|Popover|Select|Sheet|Toast|Tooltip|selection-action|tooltip-layer)[^/]*\.[cm]?[jt]sx?$/iu.test(normalized);
}

export const noMountAnimation = literalRule({
  description: "Prevent entrance animation on layout content while allowing transient-layer feedback.",
  pattern: /(?:^|\s)(?:animate-in|fade-in(?:-[^\s]+)?|slide-in-from-[^\s]+|zoom-in(?:-[^\s]+)?|appear)(?=\s|$)/u,
  message: "Layout content must not animate on mount or route change; reserve entrance motion for transient layers.",
  allowFile: transientLayerFile,
});
