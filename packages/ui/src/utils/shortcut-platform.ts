/** Platform hints select keyboard conventions, never browser feature support. */
export function resolveShortcutPlatform(platform: string): "mac" | "other" {
  return platform.startsWith("Mac") || ["iPhone", "iPad", "iPod"].includes(platform) ? "mac" : "other";
}
